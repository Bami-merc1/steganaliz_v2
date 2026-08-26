export const SUPPORTED_CARRIER_EXTENSIONS = [
  // Images
  'png', 'bmp', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
  // Audio
  'wav', 'mp3',
  // Video
  'mp4', 'avi', 'mkv', 'mov',
  // Documents
  'pdf', 'docx', 'dotx', 'docm', 'doc',
  'pptx', 'ppt', 'potx',
  'xlsx', 'xls', 'xltx',
  'odt', 'ott', 'odp', 'ods',
  'rtf', 'md', 'txt', 'log', 'csv',
  // Code / markup
  'py', 'js', 'jsx', 'ts', 'tsx',
  'css', 'html', 'xml', 'json', 'yaml', 'yml',
  // Binary / archives
  'exe', 'bin', 'iso', 'apk', 'zip', 'tar', 'gz',
  'pem', 'cer', 'key',
];

export const MAX_BATCH_FILES = 25;
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const CAPACITY_RATIO_BY_TECHNIQUE: Record<string, number> = {
  lsb: 0.12,
  dct: 0.05,
  'metadata-injection': 0.02,
  'zero-width': 0.08,
  'eof-append': 0.15,
};