import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';

const CHUNK_TYPE = 'stGz';
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function writeUint32BE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

function validatePngSignature(bytes: Uint8Array): void {
  if (bytes.length < 8 || !PNG_SIGNATURE.every((b, i) => bytes[i] === b)) {
    throw new Error('Not a valid PNG file (signature mismatch).');
  }
}

function findIENDOffset(bytes: Uint8Array): number {
  let offset = 8;
  while (offset < bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    if (type === 'IEND') return offset;
    offset += 4 + 4 + length + 4;
  }
  throw new Error('Malformed PNG: no IEND chunk found.');
}

function buildChunk(typeStr: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(typeStr);
  const lengthField = writeUint32BE(data.length);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);
  const crcField = writeUint32BE(crc32(crcInput));

  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  chunk.set(lengthField, 0);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  chunk.set(crcField, 8 + data.length);
  return chunk;
}

export const pngTextChunkEmbed: EmbedEngine = {
  technique: 'metadata-injection',
  supportedExtensions: ['png'],

  getCapacityBytes: async (): Promise<number> => {
    return Number.MAX_SAFE_INTEGER;
  },

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    validatePngSignature(bytes);

    const encoder = new TextEncoder();
    let payloadBytes: Uint8Array = encoder.encode(message);
    if (password) {
      payloadBytes = await encryptPayload(payloadBytes, password);
    }

    const flagByte = new Uint8Array([password ? 1 : 0]);
    const chunkData = new Uint8Array(flagByte.length + payloadBytes.length);
    chunkData.set(flagByte, 0);
    chunkData.set(payloadBytes, flagByte.length);

    const customChunk = buildChunk(CHUNK_TYPE, chunkData);
    const iendOffset = findIENDOffset(bytes);

    const output = new Uint8Array(bytes.length + customChunk.length);
    output.set(bytes.slice(0, iendOffset), 0);
    output.set(customChunk, iendOffset);
    output.set(bytes.slice(iendOffset), iendOffset + customChunk.length);

    return {
      blob: new Blob([output], { type: 'image/png' }),
      technique: 'metadata-injection',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: Number.MAX_SAFE_INTEGER,
    };
  },
};

export const pngTextChunkExtract: ExtractEngine = {
  technique: 'metadata-injection',
  supportedExtensions: ['png'],

  extract: async (file: File, password?: string): Promise<string> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    validatePngSignature(bytes);

    let offset = 8;
    while (offset < bytes.length) {
      const length = readUint32BE(bytes, offset);
      const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));

      if (type === CHUNK_TYPE) {
        const dataStart = offset + 8;
        const isEncrypted = bytes[dataStart] === 1;
        const payloadSlice = bytes.slice(dataStart + 1, dataStart + length);

        if (isEncrypted && !password) {
          throw new Error('This payload is encrypted. A password is required to extract it.');
        }

        if (isEncrypted && password) {
          const decrypted = await decryptPayload(payloadSlice, password);
          return new TextDecoder().decode(decrypted);
        }

        return new TextDecoder().decode(payloadSlice);
      }

      if (type === 'IEND') break;
      offset += 4 + 4 + length + 4;
    }

    throw new Error('No embedded payload chunk found in this PNG.');
  },
};