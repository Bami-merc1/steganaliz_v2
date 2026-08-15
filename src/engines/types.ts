export type EmbedTechnique =
  | 'lsb'
  | 'dct'
  | 'metadata-injection'
  | 'zero-width'
  | 'eof-append';

export interface EmbedResult {
  blob: Blob;
  technique: EmbedTechnique;
  capacityUsedBytes: number;
  capacityMaxBytes: number;
}

export interface EmbedEngine {
  technique: EmbedTechnique;
  supportedExtensions: string[];
  getCapacityBytes: (file: File) => Promise<number>;
  embed: (file: File, message: string, password?: string) => Promise<EmbedResult>;
}

export interface ExtractEngine {
  technique: EmbedTechnique;
  supportedExtensions: string[];
  extract: (file: File, password?: string) => Promise<string>;
}