import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';

const FLAG_BITS = 8;
const LENGTH_BITS = 32;
const HEADER_BITS = FLAG_BITS + LENGTH_BITS;

interface WavInfo {
  bytes: Uint8Array;
  dataChunkOffset: number;
  dataChunkLength: number;
  bitsPerSample: number;
  numChannels: number;
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(bytes.slice(offset, offset + length));
}

function parseWav(bytes: Uint8Array): WavInfo {
  if (readAscii(bytes, 0, 4) !== 'RIFF' || readAscii(bytes, 8, 4) !== 'WAVE') {
    throw new Error('Not a valid WAV file (RIFF/WAVE signature mismatch).');
  }

  let offset = 12;
  let bitsPerSample = 0;
  let numChannels = 0;
  let dataChunkOffset = -1;
  let dataChunkLength = 0;

  while (offset < bytes.length - 8) {
    const chunkId = readAscii(bytes, offset, 4);
    const chunkSize = readUint32LE(bytes, offset + 4);

    if (chunkId === 'fmt ') {
      numChannels = readUint16LE(bytes, offset + 10);
      bitsPerSample = readUint16LE(bytes, offset + 22);
    } else if (chunkId === 'data') {
      dataChunkOffset = offset + 8;
      dataChunkLength = chunkSize;
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  if (dataChunkOffset === -1) throw new Error('WAV file has no "data" chunk.');
  if (bitsPerSample !== 16) {
    throw new Error(`Only 16-bit PCM WAV is supported (this file is ${bitsPerSample}-bit).`);
  }

  return { bytes, dataChunkOffset, dataChunkLength, bitsPerSample, numChannels };
}

function sampleCapacityBits(wav: WavInfo): number {
  const sampleCount = wav.dataChunkLength / 2;
  return Math.max(0, sampleCount - HEADER_BITS);
}

export const wavLsbEmbed: EmbedEngine = {
  technique: 'lsb',
  supportedExtensions: ['wav'],

  getCapacityBytes: async (file: File): Promise<number> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const wav = parseWav(bytes);
    return Math.floor(sampleCapacityBits(wav) / 8);
  },

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const originalBytes = new Uint8Array(await file.arrayBuffer());
    const wav = parseWav(originalBytes);
    const output = new Uint8Array(originalBytes);

    const encoder = new TextEncoder();
    let payloadBytes: Uint8Array = encoder.encode(message);
    if (password) {
      payloadBytes = await encryptPayload(payloadBytes, password);
    }

    const capacityBytes = Math.floor(sampleCapacityBits(wav) / 8);
    if (payloadBytes.length > capacityBytes) {
      throw new Error(
        `Payload (${payloadBytes.length} bytes${password ? ', including encryption overhead' : ''}) exceeds carrier capacity (${capacityBytes} bytes) for WAV LSB embedding.`
      );
    }

    const flagByte = new Uint8Array([password ? 1 : 0]);
    const lengthBytes = new Uint8Array(4);
    new DataView(lengthBytes.buffer).setUint32(0, payloadBytes.length, false);

    const fullPayload = new Uint8Array(
      flagByte.length + lengthBytes.length + payloadBytes.length
    );
    fullPayload.set(flagByte, 0);
    fullPayload.set(lengthBytes, flagByte.length);
    fullPayload.set(payloadBytes, flagByte.length + lengthBytes.length);

    const bits: number[] = [];
    for (const byte of fullPayload) {
      for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
    }

    const view = new DataView(
      output.buffer,
      output.byteOffset + wav.dataChunkOffset,
      wav.dataChunkLength
    );
    for (let i = 0; i < bits.length; i++) {
      const sampleByteOffset = i * 2;
      const lowByte = view.getUint8(sampleByteOffset);
      view.setUint8(sampleByteOffset, (lowByte & 0xfe) | bits[i]);
    }

    return {
      blob: new Blob([output], { type: 'audio/wav' }),
      technique: 'lsb',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: capacityBytes,
    };
  },
};

export const wavLsbExtract: ExtractEngine = {
  technique: 'lsb',
  supportedExtensions: ['wav'],

  extract: async (file: File, password?: string): Promise<string> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const wav = parseWav(bytes);
    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset + wav.dataChunkOffset,
      wav.dataChunkLength
    );

    const readBitAt = (i: number): number => view.getUint8(i * 2) & 1;

    const headerBits: number[] = [];
    for (let i = 0; i < HEADER_BITS; i++) headerBits.push(readBitAt(i));

    const flagBits = headerBits.slice(0, FLAG_BITS);
    const lengthBits = headerBits.slice(FLAG_BITS, HEADER_BITS);

    const bitsToByte = (bitGroup: number[]): number => {
      let byte = 0;
      for (const b of bitGroup) byte = (byte << 1) | b;
      return byte;
    };

    const isEncrypted = bitsToByte(flagBits) === 1;

    const lengthBytes = new Uint8Array(4);
    for (let b = 0; b < 4; b++) {
      lengthBytes[b] = bitsToByte(lengthBits.slice(b * 8, b * 8 + 8));
    }
    const payloadLength = new DataView(lengthBytes.buffer).getUint32(0, false);

    const maxSamples = wav.dataChunkLength / 2;
    if (payloadLength === 0 || payloadLength * 8 + HEADER_BITS > maxSamples) {
      throw new Error('No valid embedded payload detected in this file.');
    }

    if (isEncrypted && !password) {
      throw new Error('This payload is encrypted. A password is required to extract it.');
    }

    const payloadBits: number[] = [];
    const totalPayloadBits = payloadLength * 8;
    for (let i = 0; i < totalPayloadBits; i++) {
      payloadBits.push(readBitAt(HEADER_BITS + i));
    }

    const payloadBytes = new Uint8Array(payloadLength);
    for (let b = 0; b < payloadLength; b++) {
      payloadBytes[b] = bitsToByte(payloadBits.slice(b * 8, b * 8 + 8));
    }

    if (isEncrypted && password) {
      const decrypted = await decryptPayload(payloadBytes, password);
      return new TextDecoder().decode(decrypted);
    }

    return new TextDecoder().decode(payloadBytes);
  },
};