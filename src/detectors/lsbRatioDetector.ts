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

// Directly counts the proportion of LSBs that are 1 vs 0 across R/G/B
// channels. Natural images have SOME inherent bias here (rarely an exact
// 50/50 split), while a full-capacity random payload pushes this ratio
// very close to 0.5 - a simpler, cruder cousin of chi-square's pair-based
// analysis, using a single aggregate statistic instead of per-pair math.
function lsbRatioScore(bytes: Uint8Array): { score: number; ratio: number } {
  let onesCount = 0;
  let totalCount = 0;

  for (let i = 0; i < bytes.length; i += 4) {
    onesCount += bytes[i] & 1;
    onesCount += bytes[i + 1] & 1;
    onesCount += bytes[i + 2] & 1;
    totalCount += 3;
  }

  if (totalCount === 0) return { score: 0, ratio: 0.5 };

  const ratio = onesCount / totalCount;
  const deviationFromHalf = Math.abs(ratio - 0.5);

  // Natural images typically show deviation in the 0.02-0.08 range for this
  // aggregate statistic. Below ~0.01 deviation is suspiciously close to a
  // coin flip.
  const normalized = 1 - Math.min(1, deviationFromHalf / 0.03);
  const score = Math.round(Math.max(0, normalized) * 100);

  return { score, ratio };
}

export const lsbRatioDetector: Detector = {
  id: 'lsb-ratio',
  name: 'LSB ratio test',
  weight: 0.9,
  supportedExtensions: ['png', 'bmp', 'jpg', 'jpeg'],

  detect: async (file: File): Promise<DetectorResult> => {
    const bytes = await getPixelBytes(file);

    if (!bytes) {
      return {
        detectorId: 'lsb-ratio',
        detectorName: 'LSB ratio test',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'File could not be decoded as a raster image.',
      };
    }

    const { score, ratio } = lsbRatioScore(bytes);

    return {
      detectorId: 'lsb-ratio',
      detectorName: 'LSB ratio test',
      score,
      label: labelForScore(score),
      applicable: true,
      details: `${(ratio * 100).toFixed(2)}% of LSBs are 1 (50% = maximally suspicious).`,
    };
  },
};