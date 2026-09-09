import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';
import VerdictBanner from './VerdictBanner';
import DetectorResultRow from './DetectorResultRow';
import { MOCK_DETECTORS } from '../../detectors/mockDetectors';
import { computeVerdict } from '../../detectors/verdictEngine';
import { useWorkspaceSync } from '../../hooks/useWorkspaceSync';
import { useAuthStore } from '../../store/useAuthStore';
import { validateCarrierFile } from '../../utils/fileValidation';
import { checkRateLimit, RATE_LIMITS } from '../../utils/rateLimit';
import { encryptWorkspaceEntry } from '../../utils/workspaceCrypto';
import type { VerdictResult } from '../../detectors/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://steganaliz-api.onrender.com';

export default function DetectPanel() {
  const [file, setFile]               = useState<File | null>(null);
  const [isScanning, setIsScanning]   = useState(false);
  const [verdict, setVerdict]         = useState<VerdictResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveLabel, setSaveLabel]     = useState('');
  const [isSaving, setIsSaving]       = useState(false);
  const [saved, setSaved]             = useState(false);

  const { addEntry: addHistoryEntry } = useWorkspaceSync();
  const { token, sessionPassword, workspaceSalt, isWorkspaceMode } = useAuthStore();

  const handleFile = async (f: File) => {
    setErrorMessage(null);
    setVerdict(null);
    setSaved(false);      // ← reset when new file selected
    setSaveLabel('');

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
    setSaved(false);

    try {
      const result = await computeVerdict(file, MOCK_DETECTORS);
      setVerdict(result);
      await addHistoryEntry({
        action: 'detect',
        fileName: file.name,
        detail: `${result.overallLabel} · ${result.overallScore}% confidence`,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const saveToComparison = async () => {
    if (!token || !sessionPassword || !workspaceSalt || !verdict || !file) return;
    setIsSaving(true);
    try {
      const data = {
        fileName:     file.name,
        overallScore: verdict.overallScore,
        overallLabel: verdict.overallLabel,
        detectors:    verdict.results.map((r) => ({
          name: r.detectorName, score: r.score, label: r.label,
        })),
        savedAt: new Date().toISOString(),
      };

      const { encryptedBlob, iv, salt } = await encryptWorkspaceEntry(
        data, sessionPassword, workspaceSalt
      );

      // Lightweight file fingerprint from first 32 bytes
      const headerBytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      const fileHash = Array.from(headerBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .padEnd(64, '0');

      const res = await fetch(`${API_BASE}/api/comparison/analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: saveLabel.trim() || file.name,
          encryptedBlob, iv, salt, fileHash,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
    } catch {
      setErrorMessage('Failed to save to comparison. Please try again.');
    } finally {
      setIsSaving(false);
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

          {/* Save to comparison — Workspace Mode only */}
          {isWorkspaceMode && !saved && (
            <div className="flex gap-2">
              <input
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder={`Label (default: ${file?.name ?? 'analysis'})`}
                className="flex-1 border border-stgBorderStrong rounded px-3 py-2 text-xs text-black bg-stgBg focus:outline-none focus:border-stgOrange"
              />
              <Button variant="secondary" onClick={saveToComparison} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save to comparison'}
              </Button>
            </div>
          )}
          {saved && (
            <p className="text-xs text-stgSuccess">
              ✓ Saved — find it in Workspace → Comparison
            </p>
          )}

          {verdict.overallScore >= 40 && (
            <div className="border border-stgBorder rounded bg-stgSurface px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-2">
                EXTRACT PAYLOAD
              </p>
              <p className="text-sm text-stgTextSecondary">
                Aggregate confidence meets the extraction threshold. Switch to the Extract tab to attempt payload recovery.
              </p>
            </div>
          )}

          <Button variant="secondary" onClick={() => { setFile(null); setVerdict(null); setErrorMessage(null); setSaved(false); }}>
            Scan another file
          </Button>
        </>
      )}
    </div>
  );
}