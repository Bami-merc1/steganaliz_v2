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
    return null; // not a decodable image — detector will report not-applicable
  }
}

// Chi-square test on PoV (pairs of values) distribution. Returns a 0-100
// suspicion score derived from how closely the even/odd pairs converge —
// closer convergence than natural images typically show implies LSB tampering.
function chiSquarePoVScore(bytes: Uint8Array): number {
  const observed = new Uint32Array(256);
  for (let i = 0; i < bytes.length; i += 4) {
    // sample R, G, B channels only — skip alpha (index i+3)
    observed[bytes[i]]++;
    observed[bytes[i + 1]]++;
    observed[bytes[i + 2]]++;
  }

  let chiSquare = 0;
  let pairsEvaluated = 0;

  for (let pairBase = 0; pairBase < 256; pairBase += 2) {
    const evenCount = observed[pairBase];
    const oddCount = observed[pairBase + 1];
    const total = evenCount + oddCount;
    if (total === 0) continue;

    const expected = total / 2; // null hypothesis: LSB is random, so 50/50 split
    chiSquare += Math.pow(evenCount - expected, 2) / expected;
    pairsEvaluated++;
  }

  if (pairsEvaluated === 0) return 0;

  // Lower chi-square (closer to 0) = pairs are suspiciously balanced = higher suspicion.
  // Normalize against pairsEvaluated as a rough degrees-of-freedom scale.
  const avgChiSquare = chiSquare / pairsEvaluated;
  const normalized = 1 - Math.min(1, avgChiSquare / 3.0);
  return Math.round(Math.max(0, normalized) * 100);
}

export const chiSquareDetector: Detector = {
  id: 'chi-square',
  name: 'Chi-square attack',
  weight: 1.0,
  supportedExtensions: ['png', 'bmp', 'jpg', 'jpeg'],

  detect: async (file: File): Promise<DetectorResult> => {
    const bytes = await getPixelBytes(file);

    if (!bytes) {
      return {
        detectorId: 'chi-square',
        detectorName: 'Chi-square attack',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'File could not be decoded as a raster image.',
      };
    }

    const score = chiSquarePoVScore(bytes);

    return {
      detectorId: 'chi-square',
      detectorName: 'Chi-square attack',
      score,
      label: labelForScore(score),
      applicable: true,
      details: 'Pairs-of-values chi-square test on RGB channel distribution.',
    };
  },
};