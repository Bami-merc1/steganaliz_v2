import { useState } from 'react';
import Button from '../shared/Button';

interface DiffResult {
  totalBytes: number;
  changedBytes: number;
  changedPercent: number;
  firstDiffs: { offset: number; original: number; modified: number }[];
  sizeA: number;
  sizeB: number;
}

export default function FileDiffViewer() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = (setter: (f: File) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => { if (input.files?.[0]) setter(input.files[0]); };
    input.click();
  };

  const compare = async () => {
    if (!fileA || !fileB) return;
    setIsComparing(true);
    setError(null);
    setResult(null);
    try {
      const [bytesA, bytesB] = await Promise.all([
        fileA.arrayBuffer().then((b) => new Uint8Array(b)),
        fileB.arrayBuffer().then((b) => new Uint8Array(b)),
      ]);
      const compareLen = Math.min(bytesA.length, bytesB.length);
      let changed = 0;
      const diffs: DiffResult['firstDiffs'] = [];
      for (let i = 0; i < compareLen; i++) {
        if (bytesA[i] !== bytesB[i]) {
          changed++;
          if (diffs.length < 50) diffs.push({ offset: i, original: bytesA[i], modified: bytesB[i] });
        }
      }
      setResult({
        totalBytes: compareLen,
        changedBytes: changed,
        changedPercent: compareLen > 0 ? (changed / compareLen) * 100 : 0,
        firstDiffs: diffs,
        sizeA: bytesA.length,
        sizeB: bytesB.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const hex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();

  return (
    <div className="space-y-5">
      <p className="text-sm text-stgTextSecondary leading-relaxed">
        Drop a clean cover file and its stego counterpart to see exactly which bytes changed
        and where — useful for verifying an embed operation or analysing an unknown stego file.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'FILE A (original / cover)', file: fileA, set: setFileA },
          { label: 'FILE B (stego / suspect)',   file: fileB, set: setFileB },
        ].map(({ label, file, set }) => (
          <div key={label}>
            <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">{label}</p>
            <button
              onClick={() => pickFile(set)}
              className="w-full border border-dashed border-stgBorderStrong rounded px-4 py-6 text-sm text-stgTextSecondary hover:border-stgOrange text-center"
            >
              {file ? file.name : 'Click to select'}
            </button>
          </div>
        ))}
      </div>

      {fileA && fileB && (
        <Button onClick={compare} disabled={isComparing}>
          {isComparing ? 'Comparing…' : 'Compare files'}
        </Button>
      )}

      {error && <p className="text-xs text-stgDanger">{error}</p>}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Bytes compared', value: result.totalBytes.toLocaleString() },
              { label: 'Bytes changed',  value: result.changedBytes.toLocaleString() },
              { label: 'Change rate',    value: `${result.changedPercent.toFixed(4)}%` },
              { label: 'Size delta',     value: `${result.sizeB - result.sizeA >= 0 ? '+' : ''}${result.sizeB - result.sizeA} B` },
            ].map(({ label, value }) => (
              <div key={label} className="border border-stgBorder rounded bg-white px-3 py-2">
                <p className="text-xs text-stgTextMuted">{label}</p>
                <p className="mono text-sm font-semibold text-black">{value}</p>
              </div>
            ))}
          </div>

          {result.firstDiffs.length > 0 && (
            <div>
              <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-2">
                FIRST {result.firstDiffs.length} DIFFERING BYTES
              </p>
              <div className="border border-stgBorder rounded overflow-hidden">
                <table className="w-full text-xs mono">
                  <thead>
                    <tr className="bg-stgBg border-b border-stgBorder">
                      <th className="text-left px-3 py-2 text-stgTextMuted font-medium">Offset</th>
                      <th className="text-left px-3 py-2 text-stgTextMuted font-medium">File A</th>
                      <th className="text-left px-3 py-2 text-stgTextMuted font-medium">File B</th>
                      <th className="text-left px-3 py-2 text-stgTextMuted font-medium">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.firstDiffs.map(({ offset, original, modified }) => (
                      <tr key={offset} className="border-b border-stgBorder last:border-0">
                        <td className="px-3 py-1.5 text-stgTextMuted">0x{offset.toString(16).toUpperCase().padStart(8, '0')}</td>
                        <td className="px-3 py-1.5 text-stgTextSecondary">{hex(original)}</td>
                        <td className="px-3 py-1.5 text-stgOrange font-semibold">{hex(modified)}</td>
                        <td className="px-3 py-1.5 text-stgTextMuted">{modified - original >= 0 ? '+' : ''}{modified - original}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.changedBytes > 50 && (
                <p className="text-xs text-stgTextMuted mt-1">
                  Showing first 50 of {result.changedBytes.toLocaleString()} changed bytes.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}