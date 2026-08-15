export type CarrierCategory = 'image' | 'audio' | 'video' | 'document' | 'code' | 'binary';

export interface CarrierFile {
  file: File;
  category: CarrierCategory;
  extension: string;
  technique: 'lsb' | 'dct' | 'metadata-injection' | 'zero-width' | 'eof-append' | 'unsupported';
  capacityBytes: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: 'embed' | 'extract' | 'detect' | 'batch-embed' | 'batch-detect' | 'metadata-strip';
  fileName: string;
  detail: string;
}