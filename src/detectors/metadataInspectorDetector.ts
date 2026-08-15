import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

const STANDARD_PNG_CHUNKS = new Set([
  'IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP',
  'tEXt', 'zTXt', 'iTXt', 'bKGD', 'pHYs', 'sBIT', 'sPLT', 'hIST', 'tIME',
]);

interface ChunkInfo {
  type: string;
  length: number;
}

function parseChunks(bytes: Uint8Array): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];
  let offset = 8; // skip PNG signature

  while (offset + 8 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
    const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    chunks.push({ type, length });
    if (type === 'IEND') break;
    offset += 4 + 4 + length + 4;
    if (length < 0 || offset > bytes.length) break; // guard against corrupt/malicious length fields
  }

  return chunks;
}

export const metadataInspectorDetector: Detector = {
  id: 'metadata',
  name: 'Metadata inspector',
  weight: 0.8,
  supportedExtensions: ['png'],

  detect: async (file: File): Promise<DetectorResult> => {
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
      return {
        detectorId: 'metadata',
        detectorName: 'Metadata inspector',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'File is not a valid PNG — chunk-level inspection not applicable.',
      };
    }

    const chunks = parseChunks(bytes);
    const nonStandardChunks = chunks.filter((c) => !STANDARD_PNG_CHUNKS.has(c.type));
    const textChunks = chunks.filter((c) => c.type === 'tEXt' || c.type === 'iTXt' || c.type === 'zTXt');
    const largeTextChunkBytes = textChunks.reduce((sum, c) => sum + c.length, 0);

    let score = 5;
    const notes: string[] = [];

    if (nonStandardChunks.length > 0) {
      score += 60;
      notes.push(`${nonStandardChunks.length} non-standard chunk type(s): ${nonStandardChunks.map((c) => c.type).join(', ')}`);
    }

    // A large text/metadata payload relative to typical usage (a few hundred
    // bytes for genuine captions/descriptions) is itself a signal, even in
    // otherwise-standard chunk types.
    if (largeTextChunkBytes > 1024) {
      score += 25;
      notes.push(`unusually large text-chunk payload (${largeTextChunkBytes} bytes)`);
    }

    score = Math.min(100, score);

    return {
      detectorId: 'metadata',
      detectorName: 'Metadata inspector',
      score,
      label: labelForScore(score),
      applicable: true,
      details: notes.length > 0 ? notes.join('; ') : 'No unusual chunk structure detected.',
    };
  },
};