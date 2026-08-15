import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

// Known magic numbers, per Week 2/4's lessons — maps extension to expected
// leading bytes. A mismatch between what the file CLAIMS to be (extension)
// and what its actual bytes say is a genuine, general-purpose red flag,
// independent of any specific embedding technique.
const SIGNATURES: Record<string, number[][]> = {
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  bmp: [[0x42, 0x4d]],
  gif: [[0x47, 0x49, 0x46, 0x38]],
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  wav: [[0x52, 0x49, 0x46, 0x46]], // RIFF — WAVE marker sits at offset 8, checked separately below
  zip: [[0x50, 0x4b, 0x03, 0x04]],
  docx: [[0x50, 0x4b, 0x03, 0x04]],
  pptx: [[0x50, 0x4b, 0x03, 0x04]],
};

function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((b, i) => bytes[i] === b);
}

export const headerConsistencyDetector: Detector = {
  id: 'header-check',
  name: 'Header consistency check',
  weight: 0.7,
  supportedExtensions: Object.keys(SIGNATURES),

  detect: async (file: File): Promise<DetectorResult> => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const candidates = SIGNATURES[ext];

    if (!candidates) {
      return {
        detectorId: 'header-check',
        detectorName: 'Header consistency check',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: `No known signature for .${ext} to check against.`,
      };
    }

    const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const matches = candidates.some((sig) => matchesSignature(headerBytes, sig));

    // WAV needs the secondary "WAVE" check at offset 8 — RIFF alone is
    // shared by other container formats (e.g. AVI), so it's not sufficient
    // on its own, per Week 2's lesson on WAV's two-part signature.
    let finalMatch = matches;
    if (ext === 'wav' && matches) {
      const waveMarker = new Uint8Array(await file.slice(8, 12).arrayBuffer());
      const waveText = new TextDecoder().decode(waveMarker);
      finalMatch = waveText === 'WAVE';
    }

    return {
      detectorId: 'header-check',
      detectorName: 'Header consistency check',
      score: finalMatch ? 5 : 85,
      label: labelForScore(finalMatch ? 5 : 85),
      applicable: true,
      details: finalMatch
        ? `File signature matches expected .${ext} format.`
        : `File signature does NOT match expected .${ext} format — possible mismatch or corruption.`,
    };
  },
};