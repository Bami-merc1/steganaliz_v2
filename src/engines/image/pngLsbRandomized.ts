import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';
import { derivePixelOrder } from '../../utils/seededShuffle';

const SALT_BYTES = 16;
const FLAG_BITS = 8;
const LENGTH_BITS = 32;
const HEADER_BITS = FLAG_BITS + LENGTH_BITS;

async function loadImageData(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { canvas, ctx, imageData };
}

function channelIndexToBufferOffset(channelIndex: number): number {
  const pixelIndex = Math.floor(channelIndex / 3);
  const channelWithinPixel = channelIndex % 3;
  return pixelIndex * 4 + channelWithinPixel;
}

function usableChannelCount(pixelCount: number): number {
  return pixelCount * 3;
}

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

function appendSaltChunk(pngBytes: Uint8Array, salt: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode('stSl');
  const crcInput = new Uint8Array(typeBytes.length + salt.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(salt, typeBytes.length);

  const crcField = new Uint8Array(4);
  new DataView(crcField.buffer).setUint32(0, crc32(crcInput), false);
  const lengthField = new Uint8Array(4);
  new DataView(lengthField.buffer).setUint32(0, salt.length, false);

  const chunk = new Uint8Array(4 + 4 + salt.length + 4);
  chunk.set(lengthField, 0);
  chunk.set(typeBytes, 4);
  chunk.set(salt, 8);
  chunk.set(crcField, 8 + salt.length);

  let offset = 8;
  while (offset < pngBytes.length) {
    const length = new DataView(
      pngBytes.buffer,
      pngBytes.byteOffset + offset,
      4
    ).getUint32(0, false);
    const type = new TextDecoder().decode(pngBytes.slice(offset + 4, offset + 8));
    if (type === 'IEND') {
      const output = new Uint8Array(pngBytes.length + chunk.length);
      output.set(pngBytes.slice(0, offset), 0);
      output.set(chunk, offset);
      output.set(pngBytes.slice(offset), offset + chunk.length);
      return output;
    }
    offset += 4 + 4 + length + 4;
  }
  throw new Error('Malformed PNG: no IEND chunk found while writing salt.');
}

function readSaltChunk(pngBytes: Uint8Array): Uint8Array | null {
  let offset = 8;
  while (offset < pngBytes.length) {
    const length = new DataView(
      pngBytes.buffer,
      pngBytes.byteOffset + offset,
      4
    ).getUint32(0, false);
    const type = new TextDecoder().decode(pngBytes.slice(offset + 4, offset + 8));
    if (type === 'stSl') {
      return Uint8Array.from(pngBytes.slice(offset + 8, offset + 8 + length));
    }
    if (type === 'IEND') return null;
    offset += 4 + 4 + length + 4;
  }
  return null;
}

export const pngLsbRandomizedEmbed: EmbedEngine = {
  technique: 'lsb',
  supportedExtensions: ['png', 'bmp'],

  getCapacityBytes: async (file: File): Promise<number> => {
    const { imageData } = await loadImageData(file);
    const pixelCount = imageData.width * imageData.height;
    const usableBits = usableChannelCount(pixelCount) - HEADER_BITS;
    return Math.max(0, Math.floor(usableBits / 8));
  },

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    if (!password) {
      throw new Error(
        'Randomized LSB requires a password - it doubles as the key for pixel-order derivation, not just encryption.'
      );
    }

    const { canvas, ctx, imageData } = await loadImageData(file);
    const encoder = new TextEncoder();
    const payloadBytes: Uint8Array = await encryptPayload(encoder.encode(message), password);

    const pixelCount = imageData.width * imageData.height;
    const totalUsableChannels = usableChannelCount(pixelCount);
    const capacityBytes = Math.max(0, Math.floor((totalUsableChannels - HEADER_BITS) / 8));

    if (payloadBytes.length > capacityBytes) {
      throw new Error(
        `Payload (${payloadBytes.length} bytes, including encryption overhead) exceeds carrier capacity (${capacityBytes} bytes) for randomized LSB embedding.`
      );
    }

    const orderSalt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const pixelOrder = await derivePixelOrder(password, orderSalt, totalUsableChannels);

    const flagByte = new Uint8Array([1]);
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

    const data = imageData.data;
    for (let i = 0; i < bits.length; i++) {
      const bufferOffset = channelIndexToBufferOffset(pixelOrder[i]);
      data[bufferOffset] = (data[bufferOffset] & 0xfe) | bits[i];
    }

    ctx.putImageData(imageData, 0, 0);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/png'
      );
    });

    const blobBytes = new Uint8Array(await blob.arrayBuffer());
    const withSalt = appendSaltChunk(blobBytes, orderSalt);

    // Copy into a fresh ArrayBuffer - the only Blob-accepted buffer type
    // that TS 6 won't complain about, since new ArrayBuffer() never
    // produces a SharedArrayBuffer (unlike .buffer.slice() whose return
    // type is ArrayBuffer | SharedArrayBuffer in TS 6's DOM lib).
    const saltCopyBuffer = new ArrayBuffer(withSalt.length);
    new Uint8Array(saltCopyBuffer).set(withSalt);

    return {
      blob: new Blob([saltCopyBuffer], { type: 'image/png' }),
      technique: 'lsb',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: capacityBytes,
    };
  },
};

export const pngLsbRandomizedExtract: ExtractEngine = {
  technique: 'lsb',
  supportedExtensions: ['png', 'bmp'],

  extract: async (file: File, password?: string): Promise<string> => {
    if (!password) {
      throw new Error(
        'Randomized LSB requires a password to derive the pixel order before extraction can begin.'
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const orderSalt = readSaltChunk(bytes);
    if (!orderSalt) {
      throw new Error(
        'No randomized-LSB salt chunk found - this file was not embedded with this technique.'
      );
    }

    const { imageData } = await loadImageData(file);
    const pixelCount = imageData.width * imageData.height;
    const totalUsableChannels = usableChannelCount(pixelCount);
    const pixelOrder = await derivePixelOrder(password, orderSalt, totalUsableChannels);

    const data = imageData.data;
    const readBitAt = (i: number): number => {
      return data[channelIndexToBufferOffset(pixelOrder[i])] & 1;
    };

    const headerBits: number[] = [];
    for (let i = 0; i < HEADER_BITS; i++) headerBits.push(readBitAt(i));

    const bitsToByte = (group: number[]): number =>
      group.reduce((byte, b) => (byte << 1) | b, 0);

    const lengthBits = headerBits.slice(FLAG_BITS, HEADER_BITS);
    const lengthBytes = new Uint8Array(4);
    for (let b = 0; b < 4; b++) {
      lengthBytes[b] = bitsToByte(lengthBits.slice(b * 8, b * 8 + 8));
    }
    const payloadLength = new DataView(lengthBytes.buffer).getUint32(0, false);

    if (payloadLength === 0 || HEADER_BITS + payloadLength * 8 > totalUsableChannels) {
      throw new Error(
        'No valid payload found at the derived pixel order - likely an incorrect password.'
      );
    }

    const payloadBits: number[] = [];
    for (let i = 0; i < payloadLength * 8; i++) {
      payloadBits.push(readBitAt(HEADER_BITS + i));
    }

    const payloadBytes = new Uint8Array(payloadLength);
    for (let b = 0; b < payloadLength; b++) {
      payloadBytes[b] = bitsToByte(payloadBits.slice(b * 8, b * 8 + 8));
    }

    const decrypted = await decryptPayload(payloadBytes, password);
    return new TextDecoder().decode(decrypted);
  },
};