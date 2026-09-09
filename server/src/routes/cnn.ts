import { Router, type Response } from 'express';
import * as tf from '@tensorflow/tfjs-node';
import sharp from 'sharp';                    // ← top-level, not dynamic
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getModel, saveModel, getModelStatus, incrementTrainedSamples, getMetric } from '../ml/model.js';
import { imageToTensor, buildTrainingBatch } from '../ml/preprocessing.js';


const router = Router();
router.use(requireAuth);

// GET /api/cnn/status
router.get('/status', async (_req: AuthRequest, res: Response): Promise<void> => {
  await getModel();
  res.json(getModelStatus());
});

// POST /api/cnn/predict
router.post('/predict', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({
    imageB64: z.string().max(10_000_000),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'imageB64 is required.' });
    return;
  }

  try {
    const model      = await getModel();
    const tensor     = await imageToTensor(parsed.data.imageB64);
    const prediction = model.predict(tensor) as tf.Tensor;
    const score      = (await prediction.data())[0];
    prediction.dispose();
    tensor.dispose();

    const label =
      score >= 0.70 ? 'STEGO' :
      score >= 0.40 ? 'SUSPICIOUS' :
      'CLEAN';

    res.json({ score: Math.round(score * 100), label, confidence: score, modelStatus: getModelStatus() });
  } catch (e) {
    res.status(500).json({ error: `Inference failed: ${e instanceof Error ? e.message : 'unknown'}` });
  }
});

// POST /api/cnn/train
router.post('/train', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({
    cleanImages: z.array(z.string()).min(1).max(50),
    stegoImages: z.array(z.string()).min(1).max(50),
    epochs:      z.number().int().min(1).max(10).default(3),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Provide cleanImages and stegoImages arrays.' });
    return;
  }

  try {
    const { cleanImages, stegoImages, epochs } = parsed.data;
    const model   = await getModel();
    const { xs, ys } = await buildTrainingBatch(cleanImages, stegoImages);

    const history = await model.fit(xs, ys, {
      epochs,
      batchSize: Math.min(16, xs.shape[0]),
      validationSplit: 0.15,
      shuffle: true,
    });

    xs.dispose();
    ys.dispose();

    const total = cleanImages.length + stegoImages.length;
    incrementTrainedSamples(total);
    await saveModel();

    res.json({
      message:       `Fine-tuning complete on ${total} images.`,
      epochs,
      finalLoss:     getMetric(history, 'loss'),
      finalAccuracy: getMetric(history, 'accuracy'),
      modelStatus:   getModelStatus(),
    });
  } catch (e) {
    res.status(500).json({ error: `Training failed: ${e instanceof Error ? e.message : 'unknown'}` });
  }
});

// POST /api/cnn/train/auto
router.post('/train/auto', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({
    cleanImageB64: z.string().max(5_000_000),
    variants:      z.number().int().min(1).max(10).default(4),
    epochs:        z.number().int().min(1).max(5).default(2),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'cleanImageB64 is required.' });
    return;
  }

  try {
    const { cleanImageB64, variants, epochs } = parsed.data;
    const stegoImages = await generateStegoVariants(cleanImageB64, variants);
    const cleanImages = Array(stegoImages.length).fill(cleanImageB64) as string[];

    const model = await getModel();
    const { xs, ys } = await buildTrainingBatch(cleanImages, stegoImages);

    const history = await model.fit(xs, ys, { epochs, batchSize: 4, shuffle: true });

    xs.dispose();
    ys.dispose();

    const total = cleanImages.length + stegoImages.length;
    incrementTrainedSamples(total);
    await saveModel();

    res.json({
      message:       `Auto-training complete. Generated ${stegoImages.length} stego variants.`,
      samplesUsed:   total,
      finalLoss:     (history.history['loss'] as number[]).at(-1),
      finalAccuracy: (history.history['acc']  as number[]).at(-1),
      modelStatus:   getModelStatus(),
    });
  } catch (e) {
    res.status(500).json({ error: `Auto-training failed: ${e instanceof Error ? e.message : 'unknown'}` });
  }
});

// ── helpers ──────────────────────────────────────────────────────────────────

const PAYLOADS = [
  'The quick brown fox jumps over the lazy dog.',
  'STEGANALIZ_CNN_TRAINING_PAYLOAD_ALPHA',
  'Hidden message for neural network training purposes.',
  'Payload injection test vector gamma 7734.',
  Array(200).fill('X').join(''),
  Array(500).fill('A').join(''),
  '01001000 01100101 01101100 01101100 01101111',
  'User submitted content for training iteration.',
  Array(100).fill('\x00\xFF').join(''),
  'Final training sample epsilon.',
];

async function generateStegoVariants(imageB64: string, count: number): Promise<string[]> {
  const buffer = Buffer.from(imageB64, 'base64');
  const { data, info } = await sharp(buffer)
    .resize(256, 256, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const results: string[] = [];

  for (let v = 0; v < count; v++) {
    const output  = Buffer.from(data);
    const payload = Buffer.from(PAYLOADS[v % PAYLOADS.length], 'utf-8');

    for (let i = 0; i < payload.length * 8 && i < output.length - 4; i++) {
      const byteIdx    = Math.floor(i / 8);
      const bitIdx     = 7 - (i % 8);
      const bit        = (payload[byteIdx] >> bitIdx) & 1;
      const offset     = i * (info.channels as number);
      output[offset]   = (output[offset] & 0xfe) | bit;
    }

    const stegoBuffer = await sharp(output, {
      raw: { width: info.width, height: info.height, channels: info.channels as 1 | 2 | 3 | 4 },
    }).png().toBuffer();

    results.push(stegoBuffer.toString('base64'));
  }

  return results;
}

export default router;