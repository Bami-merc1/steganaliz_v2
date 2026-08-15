export type VerdictLabel = 'CLEAN' | 'SUSPICIOUS' | 'STEGO';

export interface DetectorResult {
  detectorId: string;
  detectorName: string;
  score: number; // 0-100
  label: VerdictLabel;
  applicable: boolean;
  details?: string;
}

export interface Detector {
  id: string;
  name: string;
  weight: number; // relative reliability weight used by verdict engine
  supportedExtensions: string[] | 'all';
  detect: (file: File) => Promise<DetectorResult>;
}

export interface VerdictResult {
  overallScore: number;
  overallLabel: VerdictLabel;
  results: DetectorResult[];
}

export function labelForScore(score: number): VerdictLabel {
  if (score >= 70) return 'STEGO';
  if (score >= 40) return 'SUSPICIOUS';
  return 'CLEAN';
}