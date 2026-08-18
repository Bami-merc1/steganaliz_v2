import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';

const MAGIC_MARKER = new TextEncoder().encode('STGZAPND');
const FLAG_BYTES = 1;
const LENGTH_BYTES = 4;
const FRAME_OVERHEAD = MAGIC_MARKER.length + FLAG_BYTES + LENGTH_BYTES;

function findMagicMarker(bytes: Uint8Array): number {
  outer: for (let i = bytes.length - MAGIC_MARKER.length; i >= 0; i--) {
    for (let j = 0; j < MAGIC_MARKER.length; j++) {
      if (bytes[i + j] !== MAGIC_MARKER[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export const eofAppendEmbed: EmbedEngine = {
  technique: 'eof-append',
  supportedExtensions: [
    'png', 'bmp', 'jpg', 'jpeg', 'pdf', 'docx', 'pptx', 'mp3', 'mp4', 'wav',
    'exe', 'bin', 'iso', 'zip',
  ],

  getCapacityBytes: async (): Promise<number> => {
    return Number.MAX_SAFE_INTEGER;
  },

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const carrierBytes = new Uint8Array(await file.arrayBuffer());
    const encoder = new TextEncoder();

    let payloadBytes: Uint8Array = encoder.encode(message);
    if (password) {
      payloadBytes = await encryptPayload(payloadBytes, password);
    }

    const flagByte = new Uint8Array([password ? 1 : 0]);
    const lengthBytes = new Uint8Array(LENGTH_BYTES);
    new DataView(lengthBytes.buffer).setUint32(0, payloadBytes.length, false);

    const totalLength = carrierBytes.length + FRAME_OVERHEAD + payloadBytes.length;
    const output = new Uint8Array(totalLength);

    let offset = 0;
    output.set(carrierBytes, offset);
    offset += carrierBytes.length;
    output.set(MAGIC_MARKER, offset);
    offset += MAGIC_MARKER.length;
    output.set(flagByte, offset);
    offset += flagByte.length;
    output.set(lengthBytes, offset);
    offset += lengthBytes.length;
    output.set(payloadBytes, offset);

    return {
      blob: new Blob([output], { type: file.type || 'application/octet-stream' }),
      technique: 'eof-append',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: Number.MAX_SAFE_INTEGER,
    };
  },
};

export const eofAppendExtract: ExtractEngine = {
  technique: 'eof-append',
  supportedExtensions: eofAppendEmbed.supportedExtensions,

  extract: async (file: File, password?: string): Promise<string> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const markerOffset = findMagicMarker(bytes);

    if (markerOffset === -1) {
      throw new Error('No EOF-appended payload marker found in this file.');
    }

    let cursor = markerOffset + MAGIC_MARKER.length;
    const isEncrypted = bytes[cursor] === 1;
    cursor += FLAG_BYTES;

    if (cursor + LENGTH_BYTES > bytes.length) {
      throw new Error('Appended payload header is truncated or corrupted.');
    }

    const lengthView = new DataView(bytes.buffer, bytes.byteOffset + cursor, LENGTH_BYTES);
    const payloadLength = lengthView.getUint32(0, false);
    cursor += LENGTH_BYTES;

    if (cursor + payloadLength > bytes.length) {
      throw new Error(
        'Declared payload length exceeds remaining file data - file may be truncated.'
      );
    }

    if (isEncrypted && !password) {
      throw new Error('This payload is encrypted. A password is required to extract it.');
    }

    const payloadSlice = bytes.slice(cursor, cursor + payloadLength);

    if (isEncrypted && password) {
      const decrypted = await decryptPayload(payloadSlice, password);
      return new TextDecoder().decode(decrypted);
    }

    return new TextDecoder().decode(payloadSlice);
  },
};

export function hasAppendedPayload(bytes: Uint8Array): boolean {
  return findMagicMarker(bytes) !== -1;
}