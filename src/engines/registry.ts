import type { EmbedEngine, ExtractEngine, EmbedTechnique } from './types';
import { pngLsbEmbed, pngLsbExtract } from './image/pngLsb';
import { pngLsbRandomizedEmbed, pngLsbRandomizedExtract } from './image/pngLsbRandomized';
import { pngTextChunkEmbed, pngTextChunkExtract } from './image/pngTextChunk';
import { eofAppendEmbed, eofAppendExtract } from './binary/eofAppend';
import { wavLsbEmbed, wavLsbExtract } from './audio/wavLsb';

export interface EngineEntry {
  id: string; // unique across the whole registry — use this for selection, not `technique`
  technique: EmbedTechnique;
  label: string;
  embed: EmbedEngine;
  extract: ExtractEngine;
  isUnlimitedCapacity: boolean;
  requiresPassword?: boolean; // true for engines where the password is load-bearing, not just confidentiality
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
    id: 'wav-lsb',
    technique: 'lsb',
    label: 'LSB (audio samples)',
    embed: wavLsbEmbed,
    extract: wavLsbExtract,
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

  const sequentialLsb = ENGINE_REGISTRY.find((e) => e.id === 'png-lsb-sequential')!;
  if (sequentialLsb.embed.supportedExtensions.includes(ext)) return sequentialLsb;

  const wavLsb = ENGINE_REGISTRY.find((e) => e.id === 'wav-lsb')!;
  if (wavLsb.embed.supportedExtensions.includes(ext)) return wavLsb;

  const eofEntry = ENGINE_REGISTRY.find((e) => e.id === 'eof-append')!;
  if (eofEntry.embed.supportedExtensions.includes(ext)) return eofEntry;

  return null;
}

export function getEnginesSupportingExtension(fileName: string): EngineEntry[] {
  const ext = getExtension(fileName);
  return ENGINE_REGISTRY.filter((e) => e.embed.supportedExtensions.includes(ext));
}