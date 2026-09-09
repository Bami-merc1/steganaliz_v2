import { PDFDocument } from 'pdf-lib';

export interface MetadataStripResult {
  blob:          Blob;
  originalSize:  number;
  strippedSize:  number;
  bytesRemoved:  number;
  method:        string;
}

const IMAGE_EXTENSIONS = ['png', 'bmp', 'jpg', 'jpeg', 'gif', 'webp'];
const PDF_EXTENSIONS   = ['pdf'];
const MP3_EXTENSIONS   = ['mp3'];

export const METADATA_STRIPPABLE_EXTENSIONS = [
  ...IMAGE_EXTENSIONS, ...PDF_EXTENSIONS, ...MP3_EXTENSIONS,
  'svg', 'txt', 'md', 'html', 'xml', 'csv', 'wav', 'mp4', 'docx',
];

// ── Shared safe-copy helper (fixes Uint8Array<ArrayBufferLike> → Blob TS6 error) ──
function safeUint8(src: Uint8Array): Uint8Array {
  const out = new Uint8Array(src.length);
  out.set(src);
  return out;
}

// ── Image ─────────────────────────────────────────────────────────────────────
async function stripImageMetadata(file: File): Promise<MetadataStripResult> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width  = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/png'
    );
  });

  return {
    blob,
    originalSize: file.size,
    strippedSize: blob.size,
    bytesRemoved: Math.max(0, file.size - blob.size),
    method: 'canvas re-encode (strips EXIF, ICC, XMP, and trailing data)',
  };
}

// ── PDF ───────────────────────────────────────────────────────────────────────
async function stripPdfMetadata(file: File): Promise<MetadataStripResult> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });

  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('');
  doc.setCreator('');

  // pdf-lib returns Uint8Array<ArrayBufferLike> — copy into ArrayBuffer-backed one
  const outRaw = await doc.save();
  const out    = safeUint8(outRaw);           // ← line 55 fix
  const blob   = new Blob([out], { type: 'application/pdf' });

  return {
    blob,
    originalSize: file.size,
    strippedSize: blob.size,
    bytesRemoved: Math.max(0, file.size - blob.size),
    method: 'pdf-lib field clear (Title, Author, Subject, Keywords, Producer, Creator)',
  };
}

// ── MP3 ───────────────────────────────────────────────────────────────────────
function stripMp3Id3(bytes: Uint8Array): Uint8Array {
  let start = 0;
  // Strip ID3v2 header at start
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7)  |
       (bytes[9] & 0x7f);
    start = 10 + size;
  }
  // Strip ID3v1 tag at end (128 bytes starting with "TAG")
  let end = bytes.length;
  if (
    bytes.length >= 128 &&
    bytes[bytes.length - 128] === 0x54 &&   // T
    bytes[bytes.length - 127] === 0x41 &&   // A
    bytes[bytes.length - 126] === 0x47      // G
  ) {
    end = bytes.length - 128;
  }
  return bytes.slice(start, end);
}

async function stripMp3Metadata(file: File): Promise<MetadataStripResult> {
  const raw       = new Uint8Array(await file.arrayBuffer());
  const stripped  = safeUint8(stripMp3Id3(raw));  // ← line 92 fix
  const blob      = new Blob([stripped], { type: 'audio/mpeg' });

  return {
    blob,
    originalSize: file.size,
    strippedSize: blob.size,
    bytesRemoved: Math.max(0, file.size - blob.size),
    method: 'ID3v1 + ID3v2 tag removal (byte-level)',
  };
}

// ── Passthrough ───────────────────────────────────────────────────────────────
async function stripGenericMetadata(file: File): Promise<MetadataStripResult> {
  return {
    blob:         file.slice(0, file.size, file.type),
    originalSize: file.size,
    strippedSize: file.size,
    bytesRemoved: 0,
    method:       'passthrough — format-specific stripping not available for this type',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function stripMetadata(file: File): Promise<MetadataStripResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS.includes(ext)) return stripImageMetadata(file);
  if (PDF_EXTENSIONS.includes(ext))   return stripPdfMetadata(file);
  if (MP3_EXTENSIONS.includes(ext))   return stripMp3Metadata(file);
  return stripGenericMetadata(file);
}

export function isMetadataStrippable(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return [...IMAGE_EXTENSIONS, ...PDF_EXTENSIONS, ...MP3_EXTENSIONS].includes(ext);
}