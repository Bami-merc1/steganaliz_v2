import { Router, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getModel } from '../ml/model.js';
import { imageToTensor } from '../ml/preprocessing.js';
import * as tf from '@tensorflow/tfjs-node';

const router = Router();
router.use(requireAuth);

const BatchDetectSchema = z.object({
  files: z.array(
    z.object({
      name: z.string().max(255),
      b64:  z.string().max(10_000_000),
      mime: z.string().max(100),
    })
  ).min(1).max(25),
  includeCNN: z.boolean().default(false),
});

// POST /api/batch/detect — analyse up to 25 files
// Returns structured JSON results suitable for scripting
router.post('/detect', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = BatchDetectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Provide a files array (max 25).', details: parsed.error.flatten() });
    return;
  }

  const { files, includeCNN } = parsed.data;
  const results: object[] = [];
  const model = includeCNN ? await getModel() : null;

  for (const file of files) {
    const entry: Record<string, unknown> = {
      name: file.name,
      mime: file.mime,
      processedAt: new Date().toISOString(),
    };

    // Classical entropy heuristic (server-side approximation)
    const bytes = Buffer.from(file.b64, 'base64');
    const entropy = computeByteEntropy(bytes);
    const entropyScore = Math.round(Math.max(0, Math.min(100, ((entropy - 6.0) / 2.0) * 100)));

    // EOF-append marker scan
    const MAGIC = Buffer.from('STGZAPND');
    const hasEofPayload = bytes.includes(MAGIC);

    entry.classical = {
      entropyBitsPerByte: parseFloat(entropy.toFixed(3)),
      entropyScore,
      eofPayloadDetected: hasEofPayload,
      // Combined heuristic
      heuristicLabel: hasEofPayload ? 'STEGO' :
                      entropyScore >= 70 ? 'SUSPICIOUS' : 'CLEAN',
    };

    // CNN analysis (images only, if requested)
    if (includeCNN && model && isImage(file.mime)) {
      try {
        const tensor = await imageToTensor(file.b64);
        const pred   = model.predict(tensor) as tf.Tensor;
        const score  = (await pred.data())[0];
        pred.dispose();
        tensor.dispose();

        entry.cnn = {
          score:      Math.round(score * 100),
          confidence: parseFloat(score.toFixed(4)),
          label:      score >= 0.70 ? 'STEGO' : score >= 0.40 ? 'SUSPICIOUS' : 'CLEAN',
        };
      } catch {
        entry.cnn = { error: 'CNN inference failed for this file.' };
      }
    }

    results.push(entry);
  }

  res.json({
    processedAt: new Date().toISOString(),
    totalFiles:  results.length,
    results,
  });
});

// GET /api/batch/schema — returns the API schema for developer reference
router.get('/schema', (_req: AuthRequest, res: Response): void => {
  res.json({
    version: '1.0',
    endpoints: {
      'POST /api/batch/detect': {
        description: 'Analyse up to 25 files for steganographic content',
        auth: 'Bearer JWT (from POST /api/auth/login)',
        body: {
          files: 'Array of { name: string, b64: string (base64), mime: string }',
          includeCNN: 'boolean — run CNN analysis on image files (slower)',
        },
        response: {
          processedAt: 'ISO timestamp',
          totalFiles:  'number',
          results:     'Array of per-file analysis objects',
        },
      },
      'POST /api/auth/login': {
        description: 'Get a JWT token for API authentication',
        body: { email: 'string', password: 'string' },
        response: { token: 'string (Bearer JWT)', workspaceSalt: 'string', email: 'string' },
      },
    },
    exampleCurl: [
      '# 1. Login to get token',
      'TOKEN=$(curl -s -X POST https://steganaliz-api.onrender.com/api/auth/login \\',
      '  -H "Content-Type: application/json" \\',
      '  -d \'{"email":"you@example.com","password":"yourpassword"}\' | jq -r .token)',
      '',
      '# 2. Analyse a file',
      'curl -X POST https://steganaliz-api.onrender.com/api/batch/detect \\',
      '  -H "Authorization: Bearer $TOKEN" \\',
      '  -H "Content-Type: application/json" \\',
      '  -d \'{"files":[{"name":"suspect.png","b64":"\'$(base64 suspect.png)\'","mime":"image/png"}],"includeCNN":true}\'',
    ].join('\n'),
  });
});

function computeByteEntropy(bytes: Buffer): number {
  const freq = new Uint32Array(256);
  for (const b of bytes) freq[b]++;
  let e = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] === 0) continue;
    const p = freq[i] / bytes.length;
    e -= p * Math.log2(p);
  }
  return e;
}

function isImage(mime: string): boolean {
  return ['image/png', 'image/jpeg', 'image/bmp', 'image/gif'].includes(mime);
}

export default router;