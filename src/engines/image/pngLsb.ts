import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';

const FLAG_BITS = 8;
const LENGTH_BITS = 32;
const HEADER_BITS = FLAG_BITS + LENGTH_BITS;

async function loadImageData(file: File): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; imageData: ImageData }> {
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

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }
  return bits;
}

function bitsToBytes(bits: number[]): Uint8Array {
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    bytes[i] = byte;
  }
  return bytes;
}

function usableChannelCount(pixelCount: number): number {
  return pixelCount * 3;
}

function capacityForPixelCount(pixelCount: number): number {
  const usableBits = usableChannelCount(pixelCount) - HEADER_BITS;
  return Math.max(0, Math.floor(usableBits / 8));
}

export const pngLsbEmbed: EmbedEngine = {
  technique: 'lsb',
  supportedExtensions: ['png', 'bmp'],

  getCapacityBytes: async (file: File): Promise<number> => {
    const { imageData } = await loadImageData(file);
    return capacityForPixelCount(imageData.width * imageData.height);
  },

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const { canvas, ctx, imageData } = await loadImageData(file);
    const encoder = new TextEncoder();

    let payloadBytes: Uint8Array<ArrayBuffer> = encoder.encode(message);
    if (password) {
      payloadBytes = new Uint8Array(await encryptPayload(payloadBytes, password));
    }

    const pixelCount = imageData.width * imageData.height;
    const capacityBytes = capacityForPixelCount(pixelCount);

    if (payloadBytes.length > capacityBytes) {
      throw new Error(
        `Payload (${payloadBytes.length} bytes${password ? ', including encryption overhead' : ''}) exceeds carrier capacity (${capacityBytes} bytes) for LSB embedding.`
      );
    }

    const flagByte = new Uint8Array([password ? 1 : 0]);
    const lengthBytes = new Uint8Array(4);
    new DataView(lengthBytes.buffer).setUint32(0, payloadBytes.length, false);

    const fullPayload = new Uint8Array(flagByte.length + lengthBytes.length + payloadBytes.length);
    fullPayload.set(flagByte, 0);
    fullPayload.set(lengthBytes, flagByte.length);
    fullPayload.set(payloadBytes, flagByte.length + lengthBytes.length);

    const bits = bytesToBits(fullPayload);
    const data = imageData.data;

    let bitIndex = 0;
    for (let i = 0; i < data.length && bitIndex < bits.length; i += 4) {
      for (let c = 0; c < 3 && bitIndex < bits.length; c++) {
        data[i + c] = (data[i + c] & 0xfe) | bits[bitIndex];
        bitIndex++;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    });

    return {
      blob,
      technique: 'lsb',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: capacityBytes,
    };
  },
};

export const pngLsbExtract: ExtractEngine = {
  technique: 'lsb',
  supportedExtensions: ['png', 'bmp'],

  extract: async (file: File, password?: string): Promise<string> => {
    const { imageData } = await loadImageData(file);
    const data = imageData.data;

    const headerBits: number[] = [];
    for (let i = 0; i < data.length && headerBits.length < HEADER_BITS; i += 4) {
      for (let c = 0; c < 3 && headerBits.length < HEADER_BITS; c++) {
        headerBits.push(data[i + c] & 1);
      }
    }

    const flagBits = headerBits.slice(0, FLAG_BITS);
    const lengthBits = headerBits.slice(FLAG_BITS, HEADER_BITS);

    const isEncrypted = bitsToBytes(flagBits)[0] === 1;
    const lengthBytes = bitsToBytes(lengthBits);
    const payloadLength = new DataView(lengthBytes.buffer).getUint32(0, false);

    if (payloadLength === 0 || payloadLength > data.length) {
      throw new Error('No valid embedded payload detected in this file.');
    }

    if (isEncrypted && !password) {
      throw new Error('This payload is encrypted. A password is required to extract it.');
    }

    const totalPayloadBits = payloadLength * 8;
    const payloadBits: number[] = [];
    let bitsCollected = 0;
    let channelIndex = 0;

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        channelIndex++;
        if (channelIndex <= HEADER_BITS) continue;
        if (bitsCollected >= totalPayloadBits) break;
        payloadBits.push(data[i + c] & 1);
        bitsCollected++;
      }
      if (bitsCollected >= totalPayloadBits) break;
    }

    let payloadBytes = bitsToBytes(payloadBits);

    if (isEncrypted && password) {
      payloadBytes = await decryptPayload(payloadBytes, password);
    }

    return new TextDecoder().decode(payloadBytes);
  },
};