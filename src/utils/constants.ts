export const SUPPORTED_CARRIER_EXTENSIONS = [
  'png', 'bmp', 'jpg', 'jpeg', 'svg',
  'wav', 'mp3', 'mp4',
  'pdf', 'docx', 'dotx', 'docm', 'pptx', 'odt', 'ott', 'fodt', 'doc', 'uot', 'rtf', 'md', 'log', 'txt',
  'py', 'js', 'jsx', 'css', 'html', 'xml', 'csv', 'pem', 'pkt',
  'exe', 'bin', 'iso', 'apk',
];

export const CAPACITY_RATIO_BY_TECHNIQUE: Record<string, number> = {
  lsb: 0.12,
  dct: 0.05,
  'metadata-injection': 0.02,
  'zero-width': 0.08,
  'eof-append': 0.15,
};

export const MAX_BATCH_FILES = 25;
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_ZIP_EXPANSION_RATIO = 100;
export const RATE_LIMITS_EMBED_PER_MINUTE = 10;
export const RATE_LIMITS_DETECT_PER_MINUTE = 20;
export const RATE_LIMITS_BATCH_PER_MINUTE = 3;