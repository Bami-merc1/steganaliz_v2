import type { EmbedEngine, ExtractEngine, EmbedTechnique } from './types';
import { pngLsbEmbed, pngLsbExtract } from './image/pngLsb';
import { pngLsbRandomizedEmbed, pngLsbRandomizedExtract } from './image/pngLsbRandomized';
import { pngTextChunkEmbed, pngTextChunkExtract } from './image/pngTextChunk';
import { jpegComEmbed, jpegComExtract } from './image/jpegDct';
import { eofAppendEmbed, eofAppendExtract } from './binary/eofAppend';
import { wavLsbEmbed, wavLsbExtract } from './audio/wavLsb';
import { docxEmbed, docxExtract } from './document/docxEmbed';
import { pdfEmbed, pdfExtract } from './document/pdfEmbed';
import { zeroWidthEmbed, zeroWidthExtract } from './text/zeroWidthEmbed';

export interface EngineEntry {
  id: string;
  technique: EmbedTechnique;
  label: string;
  embed: EmbedEngine;
  extract: ExtractEngine;
  isUnlimitedCapacity: boolean;
  requiresPassword?: boolean;
}

export const ENGINE_REGISTRY: EngineEntry[] = [
  {
    id: 'png-lsb-sequential',
    technique: 'lsb',
    label: 'LSB (sequential, pixel data)',
    embed: pngLsbEmbed,
    extract: pngLsbExtract,
    isUnlimitedCapacity: false,
  },
  {
    id: 'png-lsb-randomized',
    technique: 'lsb',
    label: 'LSB (randomized, password-seeded)',
    embed: pngLsbRandomizedEmbed,
    extract: pngLsbRandomizedExtract,
    isUnlimitedCapacity: false,
    requiresPassword: true,
  },
  {
    id: 'png-metadata-chunk',
    technique: 'metadata-injection',
    label: 'Metadata chunk injection (PNG)',
    embed: pngTextChunkEmbed,
    extract: pngTextChunkExtract,
    isUnlimitedCapacity: true,
  },
  {
    id: 'jpeg-com',
    technique: 'metadata-injection',
    label: 'COM marker injection (JPEG)',
    embed: jpegComEmbed,
    extract: jpegComExtract,
    isUnlimitedCapacity: true,
  },
  {
    id: 'wav-lsb',
    technique: 'lsb',
    label: 'LSB (audio samples)',
    embed: wavLsbEmbed,
    extract: wavLsbExtract,
    isUnlimitedCapacity: false,
  },
  {
    id: 'docx-custom-xml',
    technique: 'metadata-injection',
    label: 'Custom XML part (DOCX/PPTX/ODT)',
    embed: docxEmbed,
    extract: docxExtract,
    isUnlimitedCapacity: true,
  },
  {
    id: 'pdf-xmp',
    technique: 'metadata-injection',
    label: 'XMP metadata injection (PDF)',
    embed: pdfEmbed,
    extract: pdfExtract,
    isUnlimitedCapacity: true,
  },
  {
    id: 'zero-width-text',
    technique: 'zero-width',
    label: 'Zero-width characters (text/markdown/HTML)',
    embed: zeroWidthEmbed,
    extract: zeroWidthExtract,
    isUnlimitedCapacity: false,
  },
  {
    id: 'eof-append',
    technique: 'eof-append',
    label: 'EOF append (any file type)',
    embed: eofAppendEmbed,
    extract: eofAppendExtract,
    isUnlimitedCapacity: true,
  },
];

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function autoSelectEngine(fileName: string): EngineEntry | null {
  const ext = getExtension(fileName);
  const preferred = [
    'png-lsb-sequential', 'wav-lsb', 'jpeg-com',
    'pdf-xmp', 'docx-custom-xml', 'zero-width-text', 'eof-append',
  ];
  for (const id of preferred) {
    const e = ENGINE_REGISTRY.find((x) => x.id === id)!;
    if (e.embed.supportedExtensions.includes(ext)) return e;
  }
  return null;
}

export function getEnginesSupportingExtension(fileName: string): EngineEntry[] {
  const ext = getExtension(fileName);
  return ENGINE_REGISTRY.filter((e) => e.embed.supportedExtensions.includes(ext));
}