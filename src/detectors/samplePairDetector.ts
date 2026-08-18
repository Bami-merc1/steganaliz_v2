import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

async function getRedChannelValues(file: File): Promise<number[] | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const values: number[] = [];
    for (let i = 0; i < data.length; i += 4) values.push(data[i]);
    return values;
  } catch {
    return null;
  }
}

// Simplified Sample Pair Analysis: examines adjacent-sample pairs (u, v)
// where u is even and v = u+1 (or vice versa) - classifying each pair by
// whether swapping their LSBs would change which is "higher." LSB embedding
// disrupts the natural correlation between adjacent samples in a way
// distinct from RS analysis's smoothness-based grouping (Week 12) - this
// looks at ORDERED transitions between specific adjacent sample values,
// not local difference sums.
function samplePairScore(values: number[]): { score: number; suspiciousRatio: number } {
  let totalPairs = 0;
  let suspiciousPairs = 0;

  for (let i = 0; i < values.length - 1; i++) {
    const u = values[i];
    const v = values[i + 1];
    const diff = Math.abs(u - v);

    // Only consider pairs that are "close" (differ by <= 1) - these are the
    // pairs whose LSB relationship is most informative, analogous to
    // chi-square's adjacent-value-pair focus but applied to spatially
    // adjacent samples instead of a static histogram.
    if (diff <= 1) {
      totalPairs++;
      // A pair is "suspicious" if u is even and v = u+1, or u is odd and
      // v = u-1 - i.e., they sit in the same PoV bucket AND appear adjacent
      // in the image. High rates of this specific adjacency, combined with
      // near-equal frequency in both directions, indicate LSB disruption.
      const sameBucket = Math.floor(u / 2) === Math.floor(v / 2);
      if (sameBucket) suspiciousPairs++;
    }
  }

  if (totalPairs === 0) return { score: 0, suspiciousRatio: 0 };

  const suspiciousRatio = suspiciousPairs / totalPairs;
  // Natural images: same-bucket adjacency for close pairs tends to run
  // moderate (not dominant). Embedding pushes this ratio up, since LSB
  // substitution increases how often adjacent close values fall in the
  // same PoV bucket.
  const normalized = Math.min(1, Math.max(0, (suspiciousRatio - 0.4) / 0.3));
  const score = Math.round(normalized * 100);

  return { score, suspiciousRatio };
}

export const samplePairDetector: Detector = {
  id: 'sample-pair',
  name: 'Sample pair analysis',
  weight: 1.0,
  supportedExtensions: ['png', 'bmp'],

  detect: async (file: File): Promise<DetectorResult> => {
    const values = await getRedChannelValues(file);

    if (!values || values.length < 2) {
      return {
        detectorId: 'sample-pair',
        detectorName: 'Sample pair analysis',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'File could not be decoded as a raster image, or is too small to analyze.',
      };
    }

    const { score, suspiciousRatio } = samplePairScore(values);

    return {
      detectorId: 'sample-pair',
      detectorName: 'Sample pair analysis',
      score,
      label: labelForScore(score),
      applicable: true,
      details: `${(suspiciousRatio * 100).toFixed(1)}% of close adjacent-sample pairs share a PoV bucket.`,
    };
  },
};