export interface MetadataStripResult {
  blob: Blob;
  originalSize: number;
  strippedSize: number;
  bytesRemoved: number;
  method: string;
}

const IMAGE_EXTENSIONS = ['png', 'bmp', 'jpg', 'jpeg', 'pdf', 'docx', 'mp3', 'mp4', 'wav', 'svg', 'txt', 'md', 'html', 'xml', 'csv',];

export const METADATA_STRIPPABLE_EXTENSIONS = IMAGE_EXTENSIONS;
export const METADATA_PASSTHROUGH_EXTENSIONS = [
  'png', 'bmp', 'jpg', 'jpeg',
  'pdf', 'docx', 'mp3', 'mp4', 'wav', 'svg',
  'txt', 'md', 'html', 'xml', 'csv',
];

async function stripImageMetadata(file: File): Promise<MetadataStripResult> {
  // Re-encoding through canvas drops EXIF, ICC profiles, XMP, and any
  // trailing/embedded data outside the pixel buffer itself — canvas only
  // ever reads and re-emits raw pixels.
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });

  return {
    blob,
    originalSize: file.size,
    strippedSize: blob.size,
    bytesRemoved: Math.max(0, file.size - blob.size),
    method: 'canvas re-encode (strips EXIF/ICC/XMP/trailing data)',
  };
}

async function stripGenericMetadata(file: File): Promise<MetadataStripResult> {
  // No format-specific parser yet for non-image types — passthrough for now.
  // Real per-format stripping (PDF metadata dict, DOCX core.xml, ID3 tags,
  // etc.) is on the roadmap; this keeps the contract stable in the meantime.
  return {
    blob: file.slice(0, file.size, file.type),
    originalSize: file.size,
    strippedSize: file.size,
    bytesRemoved: 0,
    method: 'passthrough — format-specific stripping not yet implemented',
  };
}

export async function stripMetadata(file: File): Promise<MetadataStripResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return stripImageMetadata(file);
  }
  return stripGenericMetadata(file);
}

export function isMetadataStrippable(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(ext);
}