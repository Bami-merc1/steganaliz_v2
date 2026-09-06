import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';

// Zero-width Unicode characters are invisible when rendered but distinct
// code points recoverable from the raw byte stream. We use three characters
// to encode a base-3 digit stream, which is more capacity-efficient than
// binary encoding across two characters.
//   ZWSP  (U+200B) = 0
//   ZWNJ  (U+200C) = 1
//   ZWJ   (U+200D) = 2
// Payload is framed with a sentinel sequence before and after.
// Injection point: after the first sentence (first period+space) of the text,
// making it harder to locate than simply prepending.

const ZW = ['\u200B', '\u200C', '\u200D']; // digits 0, 1, 2
const SENTINEL_START = '\u2060\u200B\u2060'; // WORD JOINER + ZWSP + WORD JOINER
const SENTINEL_END   = '\u2060\u200D\u2060';
const SUPPORTED = ['txt', 'md', 'html', 'xml', 'csv', 'log', 'rtf'];

function bytesToBase3(bytes: Uint8Array): string {
  // Convert each byte to base-3 digits (0-2), padded to 6 digits each
  // (3^6 = 729 > 255, so 6 base-3 digits covers any byte value)
  return Array.from(bytes).map((b) => {
    let n = b, digits = '';
    for (let i = 0; i < 6; i++) {
      digits = String(n % 3) + digits;
      n = Math.floor(n / 3);
    }
    return digits;
  }).join('');
}

function base3ToBytes(digits: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(digits.length / 6));
  for (let i = 0; i < bytes.length; i++) {
    const chunk = digits.slice(i * 6, i * 6 + 6);
    bytes[i] = parseInt(chunk, 3);
  }
  return bytes;
}

function encodeToZW(bytes: Uint8Array): string {
  return bytesToBase3(bytes).split('').map((d) => ZW[parseInt(d)]).join('');
}

function decodeFromZW(text: string): Uint8Array {
  const digits = text.split('').map((ch) => {
    const idx = ZW.indexOf(ch);
    return idx === -1 ? '' : String(idx);
  }).join('');
  return base3ToBytes(digits);
}

function injectIntoText(carrier: string, hidden: string): string {
  // Inject after first sentence if possible, otherwise prepend
  const idx = carrier.search(/[.!?]\s/);
  if (idx !== -1) {
    return carrier.slice(0, idx + 2) + SENTINEL_START + hidden + SENTINEL_END + carrier.slice(idx + 2);
  }
  return SENTINEL_START + hidden + SENTINEL_END + carrier;
}

function extractFromText(carrier: string): string | null {
  const start = carrier.indexOf(SENTINEL_START);
  const end = carrier.indexOf(SENTINEL_END);
  if (start === -1 || end === -1 || end <= start) return null;
  return carrier.slice(start + SENTINEL_START.length, end);
}

export const zeroWidthEmbed: EmbedEngine = {
  technique: 'zero-width' as const,
  supportedExtensions: SUPPORTED,

  getCapacityBytes: async (file: File): Promise<number> => {
    // Each byte needs 6 zero-width characters. Practical limit: file size / 6.
    // Be conservative — very large text can hold a lot.
    return Math.floor(file.size / 6);
  },

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const carrierText = await file.text();
    const encoder = new TextEncoder();
    let payloadBytes: Uint8Array = encoder.encode(message);
    if (password) payloadBytes = await encryptPayload(payloadBytes, password);

    const flagByte = new Uint8Array([password ? 1 : 0]);
    const lengthBytes = new Uint8Array(4);
    new DataView(lengthBytes.buffer).setUint32(0, payloadBytes.length, false);
    const framed = new Uint8Array(5 + payloadBytes.length);
    framed.set(flagByte, 0);
    framed.set(lengthBytes, 1);
    framed.set(payloadBytes, 5);

    const hidden = encodeToZW(framed);
    const output = injectIntoText(carrierText, hidden);

    return {
      blob: new Blob([output], { type: file.type || 'text/plain' }),
      technique: 'zero-width' as const,
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: Math.floor(file.size / 6),
    };
  },
};

export const zeroWidthExtract: ExtractEngine = {
  technique: 'zero-width' as const,
  supportedExtensions: SUPPORTED,

  extract: async (file: File, password?: string): Promise<string> => {
    const carrierText = await file.text();
    const zwSection = extractFromText(carrierText);
    if (!zwSection) throw new Error('No zero-width payload found in this file.');

    const framed = decodeFromZW(zwSection);
    if (framed.length < 5) throw new Error('Payload data is too short — possibly corrupted.');

    const isEncrypted = framed[0] === 1;
    const payloadLength = new DataView(framed.buffer, 1, 4).getUint32(0, false);
    const payload = framed.slice(5, 5 + payloadLength);

    if (isEncrypted && !password) {
      throw new Error('This payload is encrypted. A password is required to extract it.');
    }
    if (isEncrypted && password) {
      const dec = await decryptPayload(payload, password);
      return new TextDecoder().decode(dec);
    }
    return new TextDecoder().decode(payload);
  },
};