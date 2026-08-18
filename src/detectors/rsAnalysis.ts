import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

// RS (Regular-Singular) analysis, per Fridrich/Goljan/Du. Groups of 4
// adjacent pixel values are classified as Regular, Singular, or Unusable
// based on how a fixed flipping mask affects a discrimination function
// measuring local smoothness. See Week 12 of the Training curriculum for
// the full derivation this implementation follows.

const GROUP_SIZE = 4;
const FLIP_MASK = [1, 0, 0, 1]; // standard alternating mask over a 4-pixel group

// Discrimination function: sum of absolute differences between adjacent
// values in the group. Lower = smoother/more regular natural structure.
function discriminate(group: number[]): number {
  let sum = 0;
  for (let i = 0; i < group.length - 1; i++) {
    sum += Math.abs(group[i] - group[i + 1]);
  }
  return sum;
}

// LSB flip: forces value's LSB to its opposite (0xFE clear, then set inverse).
function flipLSB(value: number): number {
  return (value & 0xfe) | (1 - (value & 1));
}

function applyMask(group: number[], mask: number[]): number[] {
  return group.map((v, i) => (mask[i] === 1 ? flipLSB(v) : v));
}

interface RSCounts {
  regular: number;
  singular: number;
  unusable: number;
}

function classifyGroups(channelValues: number[], mask: number[]): RSCounts {
  const counts: RSCounts = { regular: 0, singular: 0, unusable: 0 };

  for (let i = 0; i + GROUP_SIZE <= channelValues.length; i += GROUP_SIZE) {
    const group = channelValues.slice(i, i + GROUP_SIZE);
    const originalF = discriminate(group);
    const flippedGroup = applyMask(group, mask);
    const flippedF = discriminate(flippedGroup);

    if (flippedF > originalF) counts.regular++;
    else if (flippedF < originalF) counts.singular++;
    else counts.unusable++;
  }

  return counts;
}

async function getChannelValues(file: File): Promise<number[] | null> {
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

    // Red channel only, in raster order - RS's grouping is meant to operate
    // over spatially adjacent values; interleaving R/G/B here would break
    // the "adjacent = spatially close" assumption the discrimination
    // function depends on.
    const redValues: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      redValues.push(data[i]);
    }
    return redValues;
  } catch {
    return null;
  }
}

// Converts the R_M vs S_M gap into a 0-100 suspicion score. In natural
// images R_M is reliably > S_M by a healthy margin; as embedding rate rises,
// that gap shrinks toward zero and can invert. A near-zero or negative gap
// is the suspicious signal.
function rsGapToScore(regular: number, singular: number): number {
  const total = regular + singular;
  if (total === 0) return 0;

  const gap = (regular - singular) / total; // ranges roughly -1..1
  // Natural images typically show gap in the 0.05-0.25 range for this
  // simplified single-mask implementation. Map: gap >= 0.15 -> low
  // suspicion (0), gap <= 0 -> high suspicion (100).
  const normalized = 1 - Math.min(1, Math.max(0, gap / 0.15));
  return Math.round(normalized * 100);
}

export const rsAnalysisDetector: Detector = {
  id: 'rs-analysis',
  name: 'Regular-Singular analysis',
  weight: 1.0,
  supportedExtensions: ['png', 'bmp'],

  detect: async (file: File): Promise<DetectorResult> => {
    const channelValues = await getChannelValues(file);

    if (!channelValues || channelValues.length < GROUP_SIZE) {
      return {
        detectorId: 'rs-analysis',
        detectorName: 'Regular-Singular analysis',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'File could not be decoded as a raster image, or is too small to analyze.',
      };
    }

    const { regular, singular, unusable } = classifyGroups(channelValues, FLIP_MASK);
    const score = rsGapToScore(regular, singular);

    return {
      detectorId: 'rs-analysis',
      detectorName: 'Regular-Singular analysis',
      score,
      label: labelForScore(score),
      applicable: true,
      details: `R=${regular}, S=${singular}, unusable=${unusable} (red channel, single-mask)`,
    };
  },
};