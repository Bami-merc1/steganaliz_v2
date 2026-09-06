import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';
import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped } from 'fflate';

// DOCX/PPTX/ODT are ZIP archives. We inject a custom XML part
// at a well-defined path that Word/LibreOffice ignores but we can read back.
const CUSTOM_PART_PATH = 'customXml/stgz_payload.xml';
const SUPPORTED = ['docx', 'pptx', 'odx', 'odt', 'ott', 'dotx', 'docm'];

function buildPayloadXml(flagByte: number, payloadB64: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<stgzPayload xmlns="urn:steganaliz:payload" encrypted="${flagByte}">${payloadB64}</stgzPayload>`;
}

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

export const docxEmbed: EmbedEngine = {
  technique: 'metadata-injection',
  supportedExtensions: SUPPORTED,

  getCapacityBytes: async (): Promise<number> => Number.MAX_SAFE_INTEGER,

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let zipped: Unzipped;
    try {
      zipped = unzipSync(bytes);
    } catch {
      throw new Error('Could not open this file as a ZIP archive — it may be corrupted.');
    }

    const encoder = new TextEncoder();
    let payloadBytes: Uint8Array = encoder.encode(message);
    if (password) payloadBytes = await encryptPayload(payloadBytes, password);

    const payloadXml = buildPayloadXml(password ? 1 : 0, uint8ToBase64(payloadBytes));
    zipped[CUSTOM_PART_PATH] = strToU8(payloadXml);

    const out = zipSync(zipped, { level: 6 });
    const safe = new Uint8Array(out.length);
    safe.set(out);
    return {
      blob: new Blob([safe], { type: file.type || 'application/octet-stream' }),
      technique: 'metadata-injection',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: Number.MAX_SAFE_INTEGER,
    };
  },
};

export const docxExtract: ExtractEngine = {
  technique: 'metadata-injection',
  supportedExtensions: SUPPORTED,

  extract: async (file: File, password?: string): Promise<string> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let zipped: Unzipped;
    try {
      zipped = unzipSync(bytes);
    } catch {
      throw new Error('Could not open this file as a ZIP archive.');
    }

    const part = zipped[CUSTOM_PART_PATH];
    if (!part) throw new Error('No embedded payload found in this document.');

    const xml = strFromU8(part);
    const encMatch = xml.match(/encrypted="(\d)"/);
    const dataMatch = xml.match(/>([A-Za-z0-9+/=]+)</);
    if (!dataMatch) throw new Error('Payload XML is malformed.');

    const isEncrypted = encMatch?.[1] === '1';
    const payload = base64ToUint8(dataMatch[1]);

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