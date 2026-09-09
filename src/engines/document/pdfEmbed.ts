import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';
import { PDFDocument } from 'pdf-lib';

const MAGIC_KEY    = 'stgzPayload';

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Copies a Uint8Array<ArrayBufferLike> into a fresh Uint8Array<ArrayBuffer>
// so it is accepted by new Blob() under TypeScript 6's strict buffer typing.
function toSafeBuffer(src: Uint8Array): Uint8Array<ArrayBuffer> {
  const safe = new Uint8Array(src.length) as Uint8Array<ArrayBuffer>;
  safe.set(src);
  return safe;
}

export const pdfEmbed: EmbedEngine = {
  technique: 'metadata-injection',
  supportedExtensions: ['pdf'],

  getCapacityBytes: async (): Promise<number> => Number.MAX_SAFE_INTEGER,

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    const encoder = new TextEncoder();
    let payloadBytes: Uint8Array = encoder.encode(message);
    if (password) payloadBytes = await encryptPayload(payloadBytes, password);

    const b64       = uint8ToBase64(payloadBytes);
    const encrypted = password ? '1' : '0';

    // Embed via PDF Keywords field — standards-compliant, survives re-save,
    // and is the only pdf-lib metadata vector that round-trips reliably.
    doc.setKeywords([`${MAGIC_KEY}:${encrypted}:${b64}`]);

    const outBytes = await doc.save();
    // toSafeBuffer copies into Uint8Array<ArrayBuffer> to satisfy TS6 Blob typing
    const blob = new Blob([toSafeBuffer(outBytes)], { type: 'application/pdf' });

    return {
      blob,
      technique: 'metadata-injection',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: Number.MAX_SAFE_INTEGER,
    };
  },
};

export const pdfExtract: ExtractEngine = {
  technique: 'metadata-injection',
  supportedExtensions: ['pdf'],

  extract: async (file: File, password?: string): Promise<string> => {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const keywords = doc.getKeywords();

    if (!keywords || !keywords.startsWith(`${MAGIC_KEY}:`)) {
      throw new Error('No embedded payload found in this PDF.');
    }

    // Format: "stgzPayload:0:<base64>" or "stgzPayload:1:<base64>"
    const firstColon  = keywords.indexOf(':');
    const secondColon = keywords.indexOf(':', firstColon + 1);
    if (firstColon === -1 || secondColon === -1) {
      throw new Error('Payload metadata is malformed.');
    }

    const isEncrypted = keywords.slice(firstColon + 1, secondColon) === '1';
    const b64         = keywords.slice(secondColon + 1);
    const payload     = base64ToUint8(b64);

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