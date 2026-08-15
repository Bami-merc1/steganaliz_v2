import type { EmbedResult, EmbedTechnique } from './types';
import { CAPACITY_RATIO_BY_TECHNIQUE } from '../utils/constants';

export function techniqueForExtension(ext: string): EmbedTechnique | 'unsupported' {
  if (['png', 'bmp'].includes(ext)) return 'lsb';
  if (['jpg', 'jpeg'].includes(ext)) return 'dct';
  if (['wav'].includes(ext)) return 'lsb';
  if (['pdf', 'docx', 'pptx', 'odt'].includes(ext)) return 'metadata-injection';
  if (['txt', 'md', 'html', 'xml'].includes(ext)) return 'zero-width';
  return 'unsupported';
}

export async function getMockCapacity(file: File, technique: EmbedTechnique): Promise<number> {
  const ratio = CAPACITY_RATIO_BY_TECHNIQUE[technique] ?? 0.05;
  return Math.floor(file.size * ratio);
}

export async function mockEmbed(
  file: File,
  message: string,
  technique: EmbedTechnique,
  password?: string
): Promise<EmbedResult> {
  await new Promise((r) => setTimeout(r, 600));
  const capacity = await getMockCapacity(file, technique);
  return {
    blob: file.slice(0, file.size, file.type),
    technique,
    capacityUsedBytes: new TextEncoder().encode(message).length + (password ? 28 : 0),
    capacityMaxBytes: capacity,
  };
}