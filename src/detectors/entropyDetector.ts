import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

function calculateShannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;

  const frequency = new Uint32Array(256);
  for (const byte of bytes) {
    frequency[byte]++;
  }

  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequency[i] === 0) continue;
    const probability = frequency[i] / bytes.length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy; // 0 (uniform/empty) to 8 (maximally random) bits/byte
}

// Maps entropy (0-8) to a 0-100 suspicion score. Below ~6.5 is typical for
// natural media/text; above ~7.5 approaches the random-data ceiling that
// embedded/encrypted payloads push toward.
function entropyToScore(entropy: number): number {
  const normalized = (entropy - 6.0) / (8.0 - 6.0); // 6.0 -> 0, 8.0 -> 1
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(clamped * 100);
}

export const entropyDetector: Detector = {
  id: 'entropy',
  name: 'Entropy analyzer',
  weight: 0.6, // deliberately weighted below signature/structure detectors - see false-positive note
  supportedExtensions: 'all',

  detect: async (file: File): Promise<DetectorResult> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const entropy = calculateShannonEntropy(bytes);
    const score = entropyToScore(entropy);

    return {
      detectorId: 'entropy',
      detectorName: 'Entropy analyzer',
      score,
      label: labelForScore(score),
      applicable: true,
      details: `Shannon entropy: ${entropy.toFixed(3)} bits/byte`,
    };
  },
};