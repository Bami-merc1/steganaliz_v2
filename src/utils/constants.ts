export const SUPPORTED_CARRIER_EXTENSIONS = [
  // Images
  'png', 'bmp', 'jpg', 'jpeg', 'svg', 'gif', 'webp',
  // Audio
  'wav', 'mp3',
  // Video
  'mp4', 'avi', 'mkv',
  // Documents
  'pdf', 'docx', 'dotx', 'docm', 'pptx', 'odx', 'odt', 'ott',
  'doc', 'rtf', 'md', 'log', 'txt',
  // Code / markup
  'py', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'xml', 'csv', 'json',
  // Binary
  'exe', 'bin', 'iso', 'apk', 'zip', 'pem',
];

export const MAX_BATCH_FILES = 25;
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export const CAPACITY_RATIO_BY_TECHNIQUE: Record<string, number> = {
  lsb: 0.12,
  dct: 0.05,
  'metadata-injection': 0.02,
  'zero-width': 0.08,
  'eof-append': 0.15,
};