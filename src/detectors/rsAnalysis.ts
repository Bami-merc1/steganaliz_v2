import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

const GROUP_SIZE = 4;
const MASK_M:  number[] = [1, 0, 0, 1];
const MASK_NM: number[] = [0, 1, 1, 0]; // negative/complementary mask

function discriminate(group: number[]): number {
  let sum = 0;
  for (let i = 0; i < group.length - 1; i++) sum += Math.abs(group[i] - group[i + 1]);
  return sum;
}

function flipLSB(value: number): number {
  return (value & 0xfe) | (1 - (value & 1));
}

function applyMask(group: number[], mask: number[]): number[] {
  return group.map((v, i) => (mask[i] === 1 ? flipLSB(v) : v));
}

interface RSCounts { regular: number; singular: number; unusable: number }

function classifyGroups(values: number[], mask: number[]): RSCounts {
  const counts: RSCounts = { regular: 0, singular: 0, unusable: 0 };
  for (let i = 0; i + GROUP_SIZE <= values.length; i += GROUP_SIZE) {
    const group = values.slice(i, i + GROUP_SIZE);
    const originalF = discriminate(group);
    const flippedF  = discriminate(applyMask(group, mask));
    if      (flippedF > originalF) counts.regular++;
    else if (flippedF < originalF) counts.singular++;
    else                            counts.unusable++;
  }
  return counts;
}

// Dual-masking: apply both M and -M and use the difference between
// the two R/S ratios to estimate embedding rate p.
// The system of equations is:
//   R_M - S_M   ≈ f(p)
//   R_-M - S_-M ≈ g(p)
// For simple LSB: R_M(0) > S_M(0), and as p → 0.5 the gap closes.
// We solve a simplified linear approximation sufficient for a confidence score.
function estimateEmbeddingRate(
  rm: number, sm: number, rnm: number, snm: number, total: number
): number {
  if (total === 0) return 0;
  const gapM  = (rm - sm)  / total;  // positive in natural images
  const gapNM = (rnm - snm) / total; // also positive, but smaller or inverted when embedded
  // Convergence metric: a large positive gapM with small or negative gapNM signals embedding
  const asymmetry = gapM - gapNM;
  // Map: asymmetry near 0 (both gaps equal) → low suspicion; asymmetry large → high suspicion
  const normalized = 1 - Math.min(1, Math.max(0, asymmetry / 0.15));
  return Math.round(normalized * 100);
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
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const values: number[] = [];
    for (let i = 0; i < data.length; i += 4) values.push(data[i]);
    return values;
  } catch { return null; }
}

export const rsAnalysisDetector: Detector = {
  id: 'rs-analysis',
  name: 'Regular-Singular analysis',
  weight: 1.0,
  supportedExtensions: ['png', 'bmp'],

  detect: async (file: File): Promise<DetectorResult> => {
    const values = await getChannelValues(file);
    if (!values || values.length < GROUP_SIZE) {
      return {
        detectorId: 'rs-analysis',
        detectorName: 'Regular-Singular analysis',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'File could not be decoded or is too small.',
      };
    }

    const { regular: rm,  singular: sm,  unusable: um  } = classifyGroups(values, MASK_M);
    const { regular: rnm, singular: snm, unusable: unm } = classifyGroups(values, MASK_NM);
    const total = rm + sm + um;

    const score = estimateEmbeddingRate(rm, sm, rnm, snm, total);

    // Rough payload-size estimate via quadratic approximation
    const gapM  = total > 0 ? (rm - sm)  / total : 0;
    const gapNM = total > 0 ? (rnm - snm) / total : 0;
    const estimatedRate = Math.max(0, Math.min(0.5, (gapM - gapNM) > 0 ? (gapM - gapNM) : 0));
    const estimatedBytesEmbedded = Math.round(values.length * estimatedRate / 8);

    return {
      detectorId: 'rs-analysis',
      detectorName: 'Regular-Singular analysis',
      score,
      label: labelForScore(score),
      applicable: true,
      details: `M: R=${rm} S=${sm} | -M: R=${rnm} S=${snm} | est. payload ≈ ${estimatedBytesEmbedded} bytes (dual-mask)`,
    };
  },
};