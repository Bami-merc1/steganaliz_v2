import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

const STGZ_MAGIC = new TextEncoder().encode('STGJPG');

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

export const jpegComDetector: Detector = {
  id: 'jpeg-com',
  name: 'JPEG COM marker inspector',
  weight: 1.3,
  supportedExtensions: ['jpg', 'jpeg'],

  detect: async (file: File): Promise<DetectorResult> => {
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return {
        detectorId: 'jpeg-com',
        detectorName: 'JPEG COM marker inspector',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'Not a valid JPEG file.',
      };
    }

    let offset = 2;
    let comCount = 0;
    let hasStgzPayload = false;
    let totalComBytes = 0;

    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;

      // Standalone markers (no length field)
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }

      const segLength = readUint16BE(bytes, offset + 2);
      if (segLength < 2) break;

      if (marker === 0xfe) {
        comCount++;
        const dataStart  = offset + 4;
        const dataLength = segLength - 2;
        totalComBytes   += dataLength;
        const data = bytes.slice(dataStart, dataStart + Math.min(dataLength, STGZ_MAGIC.length));
        if (STGZ_MAGIC.every((b, i) => data[i] === b)) {
          hasStgzPayload = true;
        }
      }

      offset += 2 + segLength;
    }

    let score = 5;
    const notes: string[] = [];

    if (hasStgzPayload) {
      score = 97;
      notes.push('Steganaliz JPEG COM payload marker detected');
    } else if (comCount > 0) {
      // A COM segment exists but isn't ours — still mildly suspicious
      score = comCount > 1 ? 45 : 25;
      notes.push(`${comCount} COM segment(s) found (${totalComBytes} bytes total) — unknown origin`);
    }

    return {
      detectorId: 'jpeg-com',
      detectorName: 'JPEG COM marker inspector',
      score,
      label: labelForScore(score),
      applicable: true,
      details: notes.length > 0 ? notes.join('; ') : 'No COM segments found.',
    };
  },
};