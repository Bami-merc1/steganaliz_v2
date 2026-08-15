import type { Detector, DetectorResult, VerdictResult } from './types';
import { labelForScore } from './types';

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function detectorSupportsFile(detector: Detector, extension: string): boolean {
  return detector.supportedExtensions === 'all' || detector.supportedExtensions.includes(extension);
}

export async function computeVerdict(file: File, detectors: Detector[]): Promise<VerdictResult> {
  const extension = getExtension(file.name);

  // Only run detectors that declare support for this file's extension —
  // detectors that don't (e.g. chi-square on a non-image file) are skipped
  // entirely rather than run and discarded, since some real detectors will
  // eventually do meaningful setup work before finding out they can't apply.
  const candidateDetectors = detectors.filter((d) => detectorSupportsFile(d, extension));

  const results: DetectorResult[] = await Promise.all(candidateDetectors.map((d) => d.detect(file)));

  // A detector can still self-report applicable: false at runtime (e.g. an
  // image detector that fails to decode a malformed file) even though its
  // extension matched — exclude those from both the weighted sum and the
  // total weight so they don't silently drag the average toward 0.
  let weightedSum = 0;
  let totalWeight = 0;

  results.forEach((result, i) => {
    if (!result.applicable) return;
    const detector = candidateDetectors[i];
    weightedSum += result.score * detector.weight;
    totalWeight += detector.weight;
  });

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    overallScore,
    overallLabel: labelForScore(overallScore),
    results,
  };
}