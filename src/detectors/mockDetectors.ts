import type { Detector } from './types';
import { entropyDetector } from './entropyDetector';
import { chiSquareDetector } from './chiSquareDetector';
import { rsAnalysisDetector } from './rsAnalysis';
import { eofAppendDetector } from './eofAppendDetector';
import { headerConsistencyDetector } from './headerConsistencyDetector';
import { lsbRatioDetector } from './lsbRatioDetector';
import { histogramAnalysisDetector } from './histogramAnalysisDetector';
import { samplePairDetector } from './samplePairDetector';
import { metadataInspectorDetector } from './metadataInspectorDetector';
import { signatureFingerprintDetector } from './signatureFingerprintDetector';

// Every one of the 10 detectors specified in the project doc is now a real,
// working implementation - no mocks remain. File kept as `mockDetectors.ts`
// for import-path stability across the app; consider renaming to
// `allDetectors.ts` in a later cleanup pass.
export const MOCK_DETECTORS: Detector[] = [
  entropyDetector,
  chiSquareDetector,
  rsAnalysisDetector,
  eofAppendDetector,
  headerConsistencyDetector,
  lsbRatioDetector,
  histogramAnalysisDetector,
  samplePairDetector,
  metadataInspectorDetector,
  signatureFingerprintDetector,
];