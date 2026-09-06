import type { Detector } from './types';
import { entropyDetector }           from './entropyDetector';
import { chiSquareDetector }         from './chiSquareDetector';
import { rsAnalysisDetector }        from './rsAnalysis';
import { eofAppendDetector }         from './eofAppendDetector';
import { headerConsistencyDetector } from './headerConsistencyDetector';
import { lsbRatioDetector }          from './lsbRatioDetector';
import { histogramAnalysisDetector } from './histogramAnalysisDetector';
import { samplePairDetector }        from './samplePairDetector';
import { metadataInspectorDetector } from './metadataInspectorDetector';
import { signatureFingerprintDetector } from './signatureFingerprintDetector';
import { zeroWidthDetector }         from './zeroWidthDetector';
import { jpegComDetector }           from './jpegComDetector';

// All 12 detectors — file kept as mockDetectors.ts for import-path stability.
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
  zeroWidthDetector,
  jpegComDetector,
];