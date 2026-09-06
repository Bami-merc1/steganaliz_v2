import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';
import { getEnginesSupportingExtension, type EngineEntry } from '../../engines/registry';
import { computeVerdict } from '../../detectors/verdictEngine';
import { MOCK_DETECTORS } from '../../detectors/mockDetectors';
import { formatBytes } from '../../utils/formatBytes';
import { validateCarrierFile } from '../../utils/fileValidation';

interface TechResult {
  engine: EngineEntry;
  stegoFile: File;
  capacityBytes: number;
  embedMs: number;
  verdictScore: number;
  verdictLabel: string;
  sizeDelta: number;
}

const TEST_MESSAGE = 'Algorithm comparison test payload. This message is used to benchmark each technique on the same carrier file.';

export default function AlgorithmComparison() {
  const [file, setFile] = useState<File | null>(null);
  const [engines, setEngines] = useState<EngineEntry[]>([]);
  const [results, setResults] = useState<TechResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (f: File) => {
    setError(null);
    setResults([]);
    const validation = await validateCarrierFile(f);
    if (!validation.valid) { setError(validation.reason ?? 'Invalid file.'); return; }
    const supported = getEnginesSupportingExtension(f.name).filter(
      (e) => !e.requiresPassword // skip password-required engines for auto-comparison
    );
    if (supported.length < 2) {
      setError('At least 2 password-free techniques must support this file type for comparison.');
      return;
    }
    setFile(f);
    setEngines(supported);
  };

  const runComparison = async () => {
    if (!file || engines.length === 0) return;
    setIsRunning(true);
    setResults([]);
    setError(null);
    const out: TechResult[] = [];

    for (const engine of engines) {
      setProgress(`Testing: ${engine.label}…`);
      try {
        // 1. Get capacity
        const capacityBytes = engine.isUnlimitedCapacity
          ? Number.MAX_SAFE_INTEGER
          : await engine.embed.getCapacityBytes(file);

        // 2. Embed test payload and time it
        const t0 = performance.now();
        const embedResult = await engine.embed.embed(file, TEST_MESSAGE);
        const embedMs = Math.round(performance.now() - t0);

        // 3. Build a File from the resulting Blob for detection
        const stegoFile = new File(
          [embedResult.blob],
          `stego_${engine.id}.${file.name.split('.').pop()}`,
          { type: embedResult.blob.type }
        );

        // 4. Run steganalysis on the stego output
        const verdict = await computeVerdict(stegoFile, MOCK_DETECTORS);

        out.push({
          engine,
          stegoFile,
          capacityBytes,
          embedMs,
          verdictScore: verdict.overallScore,
          verdictLabel: verdict.overallLabel,
          sizeDelta: embedResult.blob.size - file.size,
        });
      } catch (e) {
        out.push({
          engine,
          stegoFile: file,
          capacityBytes: 0,
          embedMs: 0,
          verdictScore: 0,
          verdictLabel: 'ERROR',
          sizeDelta: 0,
        });
      }
    }

    setResults(out);
    setProgress('');
    setIsRunning(false);
  };

  const LABEL_COLOR: Record<string, string> = {
    CLEAN: 'text-stgSuccess',
    SUSPICIOUS: 'text-stgWarning',
    STEGO: 'text-stgDanger',
    ERROR: 'text-stgTextMuted',
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-stgTextSecondary leading-relaxed">
        Embed the same test payload using every technique that supports the chosen carrier,
        then immediately run the full steganalysis suite on each output. This lets you
        compare capacity, speed, and detectability side-by-side for this specific file.
      </p>

      <Dropzone onFileSelected={handleFile} acceptedLabel="any supported carrier format" />

      {error && <p className="text-xs text-stgDanger">{error}</p>}

      {file && engines.length > 0 && (
        <div className="border border-stgBorder rounded bg-white px-4 py-3 text-sm space-y-1">
          <p className="font-medium text-black">{file.name}</p>
          <p className="text-xs text-stgTextMuted">
            {engines.length} techniques available: {engines.map((e) => e.label).join(' · ')}
          </p>
          <p className="text-xs text-stgTextMuted italic">
            Test message: "{TEST_MESSAGE.slice(0, 60)}…"
          </p>
        </div>
      )}

      {file && engines.length > 0 && (
        <Button onClick={runComparison} disabled={isRunning}>
          {isRunning ? progress || 'Running…' : `Compare ${engines.length} techniques`}
        </Button>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-2">
            RESULTS — {file?.name}
          </p>
          <div className="border border-stgBorder rounded overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="bg-stgBg border-b border-stgBorder">
                  {['Technique', 'Capacity', 'Embed time', 'Size delta', 'Detectability'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-stgTextMuted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(({ engine, capacityBytes, embedMs, verdictScore, verdictLabel, sizeDelta }) => (
                  <tr key={engine.id} className="border-b border-stgBorder last:border-0">
                    <td className="px-3 py-2.5 font-medium text-black">{engine.label}</td>
                    <td className="px-3 py-2.5 mono text-stgTextSecondary">
                      {capacityBytes === Number.MAX_SAFE_INTEGER ? 'Unlimited' : formatBytes(capacityBytes)}
                    </td>
                    <td className="px-3 py-2.5 mono text-stgTextSecondary">{embedMs} ms</td>
                    <td className="px-3 py-2.5 mono text-stgTextSecondary">
                      {sizeDelta === 0 ? '±0' : `${sizeDelta > 0 ? '+' : ''}${formatBytes(Math.abs(sizeDelta))}`}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`mono font-semibold ${LABEL_COLOR[verdictLabel] ?? 'text-stgTextMuted'}`}>
                        {verdictLabel}
                      </span>
                      <span className="text-stgTextMuted ml-1.5">{verdictScore}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stgTextMuted mt-2">
            Detectability reflects the steganalysis verdict on each technique's output using the
            same test payload. Lower scores indicate the technique leaves a smaller statistical footprint.
            Password-protected techniques are excluded from automatic comparison.
          </p>
        </div>
      )}
    </div>
  );
}