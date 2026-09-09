import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';

// JPEG COM (comment) marker injection.
// JPEG's lossy pipeline destroys pixel-LSB changes, but the COM marker
// (0xFF 0xFE) is part of the compressed bitstream structure itself and
// survives re-save as long as the file is not re-encoded from scratch.
// This is the correct, lossless JPEG steganography approach for a
// browser-only tool without a full DCT coefficient parser.

const COM_MARKER   = new Uint8Array([0xff, 0xfe]);
const SOI_MARKER   = new Uint8Array([0xff, 0xd8]);
const FLAG_BYTE    = 1; // byte: 0 = plaintext, 1 = encrypted
const MAGIC        = new TextEncoder().encode('STGJPG');

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function buildComChunk(data: Uint8Array): Uint8Array {
  // COM structure: [0xFF 0xFE] [length: 2 bytes BE, includes itself] [data]
  const length = data.length + 2; // length field counts itself
  const chunk = new Uint8Array(2 + 2 + data.length);
  chunk[0] = 0xff; chunk[1] = 0xfe;
  chunk[2] = (length >> 8) & 0xff;
  chunk[3] = length & 0xff;
  chunk.set(data, 4);
  return chunk;
}

function injectAfterSOI(jpegBytes: Uint8Array, chunk: Uint8Array): Uint8Array {
  const out = new Uint8Array(jpegBytes.length + chunk.length);
  out.set(jpegBytes.slice(0, 2), 0);
  out.set(chunk, 2);
  out.set(jpegBytes.slice(2), 2 + chunk.length);
  return out; // already fresh Uint8Array<ArrayBuffer> — but the blob line needs fixing
}

function extractComPayload(jpegBytes: Uint8Array): Uint8Array | null {
  let offset = 2; // skip SOI
  while (offset < jpegBytes.length - 1) {
    if (jpegBytes[offset] !== 0xff) break;
    const marker = jpegBytes[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS — stop
    if (marker === 0xfe) {
      // COM marker found
      const segLength = readUint16BE(jpegBytes, offset + 2);
      const dataStart = offset + 4;
      const dataLength = segLength - 2;
      const data = jpegBytes.slice(dataStart, dataStart + dataLength);
      // Check for our magic prefix
      if (data.length > MAGIC.length && MAGIC.every((b, i) => data[i] === b)) {
        return data.slice(MAGIC.length);
      }
      offset += 2 + segLength;
    } else {
      if (offset + 3 >= jpegBytes.length) break;
      const segLength = readUint16BE(jpegBytes, offset + 2);
      offset += 2 + segLength;
    }
  }
  return null;
}

export const jpegComEmbed: EmbedEngine = {
  technique: 'metadata-injection',
  supportedExtensions: ['jpg', 'jpeg'],

  getCapacityBytes: async (): Promise<number> => {
    // COM segment length field is 2 bytes (max 65535), minus 2 for length itself
    // minus MAGIC prefix minus flag byte minus 4 length bytes
    return 65535 - 2 - MAGIC.length - 1 - 4;
  },

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new Error('Not a valid JPEG file.');
    }

    const encoder = new TextEncoder();
    let payloadBytes: Uint8Array = encoder.encode(message);
    if (password) {
      payloadBytes = await encryptPayload(payloadBytes, password);
    }

    const flagByte = new Uint8Array([password ? 1 : 0]);
    const lengthBytes = new Uint8Array(4);
    new DataView(lengthBytes.buffer).setUint32(0, payloadBytes.length, false);

    const chunkData = new Uint8Array(
      MAGIC.length + flagByte.length + lengthBytes.length + payloadBytes.length
    );
    chunkData.set(MAGIC, 0);
    chunkData.set(flagByte, MAGIC.length);
    chunkData.set(lengthBytes, MAGIC.length + 1);
    chunkData.set(payloadBytes, MAGIC.length + 5);

    const comChunk = buildComChunk(chunkData);
    const output = injectAfterSOI(bytes, comChunk);

    return {
      blob: new Blob([new Uint8Array(output)], { type: 'image/jpeg' }),      
      technique: 'metadata-injection',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: 65535 - 2 - MAGIC.length - 5,
    };
  },
};

export const jpegComExtract: ExtractEngine = {
  technique: 'metadata-injection',
  supportedExtensions: ['jpg', 'jpeg'],

  extract: async (file: File, password?: string): Promise<string> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const raw = extractComPayload(bytes);
    if (!raw) throw new Error('No embedded payload found in this JPEG.');

    const isEncrypted = raw[0] === 1;
    const payloadLength = new DataView(raw.buffer, raw.byteOffset + 1, 4).getUint32(0, false);
    const payload = raw.slice(5, 5 + payloadLength);

    if (isEncrypted && !password) {
      throw new Error('This payload is encrypted. A password is required to extract it.');
    }
    if (isEncrypted && password) {
      const decrypted = await decryptPayload(payload, password);
      return new TextDecoder().decode(decrypted);
    }
    return new TextDecoder().decode(payload);
  },
};