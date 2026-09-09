import * as tf from '@tensorflow/tfjs-node';
import sharp from 'sharp';

const TARGET_SIZE = 128;

// Decode base64 image → greyscale 128×128 float32 tensor normalised to [-1, 1]
export async function imageToTensor(imageB64: string): Promise<tf.Tensor4D> {
  const buffer = Buffer.from(imageB64, 'base64');

  const pixels = await sharp(buffer)
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'cover' })
    .greyscale()
    .raw()
    .toBuffer();

  const float32 = new Float32Array(TARGET_SIZE * TARGET_SIZE);
  for (let i = 0; i < float32.length; i++) {
    // Normalise [0, 255] → [-1, 1]
    float32[i] = (pixels[i] / 127.5) - 1.0;
  }

  // Shape: [1, 128, 128, 1]
  return tf.tensor4d(float32, [1, TARGET_SIZE, TARGET_SIZE, 1]);
}

// Build a training batch from arrays of clean + stego base64 images
export async function buildTrainingBatch(
  cleanImages: string[],
  stegoImages: string[]
): Promise<{ xs: tf.Tensor4D; ys: tf.Tensor2D }> {
  const tensors: tf.Tensor4D[] = [];
  const labels: number[] = [];

  for (const img of cleanImages) {
    tensors.push(await imageToTensor(img));
    labels.push(0); // clean
  }
  for (const img of stegoImages) {
    tensors.push(await imageToTensor(img));
    labels.push(1); // stego
  }

  // Shuffle the batch
  const indices = Array.from({ length: tensors.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5);

  const shuffledTensors = indices.map((i) => tensors[i]);
  const shuffledLabels  = indices.map((i) => labels[i]);

  const xs = tf.concat(shuffledTensors, 0) as tf.Tensor4D;
  const ys = tf.tensor2d(shuffledLabels, [shuffledLabels.length, 1]);

  // Clean up individual tensors
  tensors.forEach((t) => t.dispose());

  return { xs, ys };
}