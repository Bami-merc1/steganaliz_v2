import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';
import VerdictBanner from './VerdictBanner';
import DetectorResultRow from './DetectorResultRow';
import { MOCK_DETECTORS } from '../../detectors/mockDetectors';
import { computeVerdict } from '../../detectors/verdictEngine';
import { useHistoryStore } from '../../store/useHistoryStore';
import { validateCarrierFile } from '../../utils/fileValidation';
import { checkRateLimit, RATE_LIMITS } from '../../utils/rateLimit';
import type { VerdictResult } from '../../detectors/types';

export default function DetectPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const handleFile = async (f: File) => {
    setErrorMessage(null);
    setVerdict(null);

    const validation = await validateCarrierFile(f);
    if (!validation.valid) {
      setErrorMessage(validation.reason ?? 'File validation failed.');
      return;
    }

    setFile(f);
  };

  const handleScan = async () => {
    if (!file) return;

    if (!checkRateLimit('detect', RATE_LIMITS.detect.maxCalls, RATE_LIMITS.detect.windowMs)) {
      setErrorMessage('Rate limit reached — please wait a moment before scanning again.');
      return;
    }

    setIsScanning(true);
    setVerdict(null);
    setErrorMessage(null);

    try {
      const result = await computeVerdict(file, MOCK_DETECTORS);
      setVerdict(result);
      addHistoryEntry({
        action: 'detect',
        fileName: file.name,
        detail: `${result.overallLabel} · ${result.overallScore}% confidence`,
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Dropzone onFileSelected={handleFile} acceptedLabel="any supported carrier format" />

      {errorMessage && <p className="text-xs text-stgDanger">{errorMessage}</p>}

      {file && !verdict && (
        <Button onClick={handleScan} disabled={isScanning}>
          {isScanning ? 'Running detectors…' : 'Run detection'}
        </Button>
      )}

      {verdict && (
        <>
          <VerdictBanner label={verdict.overallLabel} score={verdict.overallScore} />

          <div className="border border-stgBorder rounded bg-stgSurface px-4 py-1">
            {verdict.results.map((r) => (
              <DetectorResultRow key={r.detectorId} {...r} />
            ))}
          </div>

          {verdict.overallScore >= 40 && (
            <div className="border border-stgBorder rounded bg-stgSurface px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-2">
                EXTRACT PAYLOAD
              </p>
              <p className="text-sm text-stgTextSecondary">
                Aggregate confidence meets the extraction threshold. Switch to the Extract
                tab to attempt payload recovery.
              </p>
            </div>
          )}

          <Button
            variant="secondary"
            onClick={() => { setFile(null); setVerdict(null); setErrorMessage(null); }}
          >
            Scan another file
          </Button>
        </>
      )}
    </div>
  );
}