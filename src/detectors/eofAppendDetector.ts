import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';
import { hasAppendedPayload } from '../engines/binary/eofAppend';

export const eofAppendDetector: Detector = {
  id: 'eof-append',
  name: 'EOF append detector',
  weight: 1.4,
  supportedExtensions: 'all',

  detect: async (file: File): Promise<DetectorResult> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const found = hasAppendedPayload(bytes);

    return {
      detectorId: 'eof-append',
      detectorName: 'EOF append detector',
      score: found ? 95 : 5,
      label: labelForScore(found ? 95 : 5),
      applicable: true,
      details: found
        ? 'Steganaliz EOF-append marker found — this file contains appended payload data.'
        : 'No known EOF-append marker found.',
    };
  },
};