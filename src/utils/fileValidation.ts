import { SUPPORTED_CARRIER_EXTENSIONS } from './constants';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_ZIP_EXPANSION_RATIO = 100;

const MAGIC_NUMBERS: Record<string, number[][]> = {
  png:  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  bmp:  [[0x42, 0x4d]],
  jpg:  [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  gif:  [[0x47, 0x49, 0x46, 0x38]],
  wav:  [[0x52, 0x49, 0x46, 0x46]],
  pdf:  [[0x25, 0x50, 0x44, 0x46]],
  docx: [[0x50, 0x4b, 0x03, 0x04]],
  pptx: [[0x50, 0x4b, 0x03, 0x04]],
  zip:  [[0x50, 0x4b, 0x03, 0x04]],
  mp3:  [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]],
};

const DANGEROUS_MIME_PREFIXES = [
  'text/html',
  'application/javascript',
  'text/javascript',
];

export function validateFileSize(file: File): ValidationResult {
  if (file.size === 0) {
    return { valid: false, reason: 'File is empty.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      reason: `File exceeds the 100 MB size limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    };
  }
  return { valid: true };
}

export function validateExtension(file: File): ValidationResult {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ext) {
    return { valid: false, reason: 'File has no extension.' };
  }
  if (!SUPPORTED_CARRIER_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      reason: `Extension ".${ext}" is not a supported carrier format.`,
    };
  }
  return { valid: true };
}

export function validateMimeType(file: File): ValidationResult {
  const mime = file.type.toLowerCase();
  for (const dangerous of DANGEROUS_MIME_PREFIXES) {
    if (mime.startsWith(dangerous)) {
      return {
        valid: false,
        reason: `MIME type "${file.type}" is not permitted as a carrier — potential script injection risk.`,
      };
    }
  }
  return { valid: true };
}

// Explicitly typed as Promise<ValidationResult> to match the async keyword
export async function validateMagicNumber(file: File): Promise<ValidationResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const candidates = MAGIC_NUMBERS[ext];

  if (!candidates) return { valid: true };

  const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (ext === 'mp4') {
    const ftypMarker = new TextDecoder().decode(headerBytes.slice(4, 8));
    if (ftypMarker !== 'ftyp') {
      return {
        valid: false,
        reason: 'File does not appear to be a valid MP4 (no ftyp marker).',
      };
    }
    return { valid: true };
  }

  if (ext === 'wav') {
    const riff = new TextDecoder().decode(headerBytes.slice(0, 4));
    const wave = new TextDecoder().decode(
      new Uint8Array(await file.slice(8, 12).arrayBuffer())
    );
    if (riff !== 'RIFF' || wave !== 'WAVE') {
      return {
        valid: false,
        reason: 'File does not appear to be a valid WAV (RIFF/WAVE mismatch).',
      };
    }
    return { valid: true };
  }

  const matches = candidates.some((sig) =>
    sig.every((byte, i) => headerBytes[i] === byte)
  );

  if (!matches) {
    return {
      valid: false,
      reason: `File signature does not match the expected ".${ext}" format — possible extension mismatch or corruption.`,
    };
  }

  return { valid: true };
}

export async function validateZipExpansion(file: File): Promise<ValidationResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const zipExtensions = ['zip', 'docx', 'pptx', 'xlsx', 'odt', 'apk'];
  if (!zipExtensions.includes(ext)) return { valid: true };

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let totalUncompressed = 0;
    let offset = 0;

    while (offset < bytes.length - 30) {
      if (
        bytes[offset] === 0x50 &&
        bytes[offset + 1] === 0x4b &&
        bytes[offset + 2] === 0x03 &&
        bytes[offset + 3] === 0x04
      ) {
        const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
        const compressedSize = view.getUint32(18, true);
        const uncompressedSize = view.getUint32(22, true);
        const fileNameLength = view.getUint16(26, true);
        const extraLength = view.getUint16(28, true);

        totalUncompressed += uncompressedSize;

        if (
          totalUncompressed > 0 &&
          file.size > 0 &&
          totalUncompressed / file.size > MAX_ZIP_EXPANSION_RATIO
        ) {
          return {
            valid: false,
            reason: `Suspicious compression ratio (${Math.round(totalUncompressed / file.size)}× expansion) — possible zip bomb. File rejected.`,
          };
        }

        offset += 30 + fileNameLength + extraLength + compressedSize;
      } else {
        offset++;
      }
    }
  } catch {
    // malformed ZIP — let the engine handle it
  }

  return { valid: true };
}

export async function validateCarrierFile(file: File): Promise<ValidationResult> {
  const syncChecks: ValidationResult[] = [
    validateFileSize(file),
    validateExtension(file),
    validateMimeType(file),
  ];

  for (const result of syncChecks) {
    if (!result.valid) return result;
  }

  const magicResult = await validateMagicNumber(file);
  if (!magicResult.valid) return magicResult;

  const zipResult = await validateZipExpansion(file);
  if (!zipResult.valid) return zipResult;

  return { valid: true };
}