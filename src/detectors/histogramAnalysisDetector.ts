import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

async function getPixelBytes(file: File): Promise<Uint8Array | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return new Uint8Array(imageData.data.buffer);
  } catch {
    return null;
  }
}

// Measures "comb-like" irregularity in the histogram - LSB embedding tends
// to smooth out fine-grained value-to-value variation (recall Week 5's
// flattening effect), so we look at the average absolute difference between
// ADJACENT histogram bins as a roughness measure, distinct from chi-square's
// pair-specific analysis.
function histogramRoughnessScore(bytes: Uint8Array): { score: number; roughness: number } {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < bytes.length; i += 4) {
    histogram[bytes[i]]++;
    histogram[bytes[i + 1]]++;
    histogram[bytes[i + 2]]++;
  }

  let totalDiff = 0;
  for (let i = 0; i < 255; i++) {
    totalDiff += Math.abs(histogram[i] - histogram[i + 1]);
  }
  const avgDiff = totalDiff / 255;

  const totalSamples = bytes.length * 0.75; // R+G+B out of RGBA
  const avgBinCount = totalSamples / 256;
  const normalizedRoughness = avgBinCount > 0 ? avgDiff / avgBinCount : 0;

  // Lower normalized roughness = smoother histogram = more suspicious.
  // Natural images typically show normalizedRoughness above ~0.15;
  // heavily embedded images trend lower as neighboring bins equalize.
  const normalized = 1 - Math.min(1, normalizedRoughness / 0.15);
  const score = Math.round(Math.max(0, normalized) * 100);

  return { score, roughness: normalizedRoughness };
}

export const histogramAnalysisDetector: Detector = {
  id: 'histogram',
  name: 'Histogram analysis',
  weight: 0.9,
  supportedExtensions: ['png', 'bmp', 'jpg', 'jpeg'],

  detect: async (file: File): Promise<DetectorResult> => {
    const bytes = await getPixelBytes(file);

    if (!bytes) {
      return {
        detectorId: 'histogram',
        detectorName: 'Histogram analysis',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'File could not be decoded as a raster image.',
      };
    }

    const { score, roughness } = histogramRoughnessScore(bytes);

    return {
      detectorId: 'histogram',
      detectorName: 'Histogram analysis',
      score,
      label: labelForScore(score),
      applicable: true,
      details: `Histogram roughness: ${roughness.toFixed(4)} (lower = smoother = more suspicious).`,
    };
  },
};