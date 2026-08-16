export const SUPPORTED_CARRIER_EXTENSIONS = [
  // Images
  'png', 'bmp', 'jpg', 'jpeg', 'svg', 'gif',
  // Audio
  'wav', 'mp3',
  // Video
  'mp4',
  // Documents
  'pdf', 'docx', 'dotx', 'docm', 'pptx', 'odt', 'ott',
  'doc', 'rtf', 'md', 'log', 'txt',
  // Code / markup
  'py', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'xml', 'csv', 'json',
  // Binary
  'exe', 'bin', 'iso', 'apk', 'zip', 'pem',
];

export const MAX_BATCH_FILES = 25;
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

// Capacity estimation ratios for engines that don't compute capacity
// directly from file content (e.g. display purposes, not actual embedding)
export const CAPACITY_RATIO_BY_TECHNIQUE: Record<string, number> = {
  lsb: 0.12,
  dct: 0.05,
  'metadata-injection': 0.02,
  'zero-width': 0.08,
  'eof-append': 0.15,
};