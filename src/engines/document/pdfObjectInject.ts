// src/engines/document/pdfObjectInject.ts
import { PDFDocument, PDFDict, PDFName, PDFHexString } from 'pdf-lib';
import type { EmbedEngine, ExtractEngine, EmbedResult } from '../types';
import { encryptPayload, decryptPayload } from '../../utils/crypto';

const MARKER_KEY = 'STGZType';
const MARKER_VALUE = 'StgZPayload';

export const pdfObjectInjectEmbed: EmbedEngine = {
  technique: 'metadata-injection',
  supportedExtensions: ['pdf'],

  getCapacityBytes: async (): Promise<number> => Number.MAX_SAFE_INTEGER,

  embed: async (file: File, message: string, password?: string): Promise<EmbedResult> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    const encoder = new TextEncoder();
    let payloadBytes: Uint8Array = encoder.encode(message);
    if (password) {
      payloadBytes = await encryptPayload(payloadBytes, password);
    }

    // Store payload as a hex string inside a dedicated, unreferenced
    // indirect object - pdf-lib serializes every object registered in the
    // document's context regardless of whether the page tree points to it,
    // exactly the same "well-formed but ignorable" property PNG ancillary
    // chunks rely on.
    const hex = Array.from(payloadBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const payloadDict = pdfDoc.context.obj({
      [MARKER_KEY]: PDFName.of(MARKER_VALUE),
      Flag: password ? 1 : 0,
      Data: PDFHexString.of(hex),
    });
    pdfDoc.context.register(payloadDict);

    const outBytes = await pdfDoc.save({ useObjectStreams: false });

    return {
      blob: new Blob([new Uint8Array(outBytes)], { type: 'application/pdf' }),
      technique: 'metadata-injection',
      capacityUsedBytes: payloadBytes.length,
      capacityMaxBytes: Number.MAX_SAFE_INTEGER,
    };
  },
};

export const pdfObjectInjectExtract: ExtractEngine = {
  technique: 'metadata-injection',
  supportedExtensions: ['pdf'],

  extract: async (file: File, password?: string): Promise<string> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    let found: PDFDict | null = null;
    for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFDict) {
        const typeVal = obj.get(PDFName.of(MARKER_KEY));
        if (typeVal instanceof PDFName && typeVal.asString() === `/${MARKER_VALUE}`) {
          found = obj;
          break;
        }
      }
    }

    if (!found) {
      throw new Error('No embedded payload object found in this PDF.');
    }

    const flagObj = found.get(PDFName.of('Flag'));
    const dataObj = found.get(PDFName.of('Data'));
    const isEncrypted = flagObj?.toString() === '1';

    if (!(dataObj instanceof PDFHexString)) {
      throw new Error('Payload object is malformed.');
    }

    const hex = dataObj.asString();
    const payloadBytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < payloadBytes.length; i++) {
      payloadBytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }

    if (isEncrypted && !password) {
      throw new Error('This payload is encrypted. A password is required to extract it.');
    }

    if (isEncrypted && password) {
      const decrypted = await decryptPayload(payloadBytes, password);
      return new TextDecoder().decode(decrypted);
    }

    return new TextDecoder().decode(payloadBytes);
  },
};