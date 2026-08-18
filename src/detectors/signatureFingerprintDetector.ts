import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

interface KnownSignature {
  name: string;
  marker: Uint8Array;
}

// Known byte-sequence fingerprints left by specific steganography tools or
// techniques. Currently limited to this project's own engines' markers -
// an honest scope: claiming to fingerprint third-party tools (e.g. classic
// tools like OpenStego or Steghide) would require verified samples of their
// actual output to derive real signatures from, which isn't available here.
const KNOWN_SIGNATURES: KnownSignature[] = [
  { name: 'Steganaliz EOF-append marker', marker: new TextEncoder().encode('STGZAPND') },
  { name: 'Steganaliz metadata-chunk type (stGz)', marker: new TextEncoder().encode('stGz') },
  { name: 'Steganaliz randomized-LSB salt chunk (stSl)', marker: new TextEncoder().encode('stSl') },
];

function findMarker(bytes: Uint8Array, marker: Uint8Array): boolean {
  outer: for (let i = 0; i <= bytes.length - marker.length; i++) {
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i + j] !== marker[j]) continue outer;
    }
    return true;
  }
  return false;
}

export const signatureFingerprintDetector: Detector = {
  id: 'signature',
  name: 'Signature fingerprinter',
  weight: 1.4,
  supportedExtensions: 'all',

  detect: async (file: File): Promise<DetectorResult> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const matches = KNOWN_SIGNATURES.filter((sig) => findMarker(bytes, sig.marker));

    const score = matches.length > 0 ? 97 : 3;

    return {
      detectorId: 'signature',
      detectorName: 'Signature fingerprinter',
      score,
      label: labelForScore(score),
      applicable: true,
      details:
        matches.length > 0
          ? `Matched known signature(s): ${matches.map((m) => m.name).join(', ')}`
          : `No known tool signatures found (checked against ${KNOWN_SIGNATURES.length} known markers).`,
    };
  },
};