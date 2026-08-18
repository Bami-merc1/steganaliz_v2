import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';
import { getEnginesSupportingExtension } from '../../engines/registry';

interface TechniqueAttempt {
  technique: string;
  status: 'pending' | 'success' | 'failed';
  result?: string;
  errorMessage?: string;
}

export default function CTFPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [wordlist, setWordlist] = useState('');
  const [attempts, setAttempts] = useState<TechniqueAttempt[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hexPreview, setHexPreview] = useState<string>('');

  const handleFile = async (f: File) => {
    setFile(f);
    setAttempts([]);
    const buffer = await f.arrayBuffer();
    const bytes = new Uint8Array(buffer).slice(0, 256);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    setHexPreview(hex);
  };

  const runMultiTechnique = async () => {
    if (!file) return;
    setIsRunning(true);

    const passwords = wordlist.split('\n').map((p) => p.trim()).filter(Boolean);
    const engines = getEnginesSupportingExtension(file.name);
    const results: TechniqueAttempt[] = [];

    if (engines.length === 0) {
      setAttempts([{
        technique: 'Format check',
        status: 'failed',
        errorMessage: 'No implemented extraction engine supports this file type.',
      }]);
      setIsRunning(false);
      return;
    }

    for (const engine of engines) {
      // Try unencrypted first for this engine
      try {
        const message = await engine.extract.extract(file);
        results.push({
          technique: `${engine.label} (no password)`,
          status: 'success',
          result: message,
        });
        setAttempts([...results]);
        setIsRunning(false);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Extraction failed.';
        const requiresPassword = msg.includes('encrypted') && msg.includes('password is required');
        results.push({
          technique: `${engine.label} (no password)`,
          status: 'failed',
          errorMessage: requiresPassword ? 'Payload requires a password.' : msg,
        });
        setAttempts([...results]);

        // Only worth trying the wordlist against this engine if the failure
        // was specifically "needs a password" - a different failure (e.g.
        // "no valid payload detected") means this engine's technique isn't
        // present at all, so cycling passwords against it would waste time.
        if (!requiresPassword || passwords.length === 0) continue;

        for (const pw of passwords) {
          setAttempts([...results, { technique: `${engine.label} (trying "${pw}")`, status: 'pending' }]);
          try {
            const message = await engine.extract.extract(file, pw);
            results.push({
              technique: `${engine.label} (password: "${pw}")`,
              status: 'success',
              result: message,
            });
            setAttempts([...results]);
            setIsRunning(false);
            return;
          } catch {
            results.push({
              technique: `${engine.label} (password: "${pw}")`,
              status: 'failed',
              errorMessage: 'Incorrect password.',
            });
          }
        }
        setAttempts([...results]);
      }
    }

    setIsRunning(false);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Dropzone onFileSelected={handleFile} acceptedLabel="any suspect file" />

      {file && (
        <div>
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
            HEX PREVIEW (first 256 bytes)
          </label>
          <pre className="mono text-xs leading-relaxed bg-stgBlack text-stgTextOnDark rounded px-3 py-3 overflow-x-auto whitespace-pre-wrap break-all">
            {hexPreview}
          </pre>
        </div>
      )}

      {file && (
        <div>
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
            WORDLIST (one password per line, tried against any encrypted payload found)
          </label>
          <textarea
            value={wordlist}
            onChange={(e) => setWordlist(e.target.value)}
            placeholder={'password123\nletmein\nadmin'}
            rows={5}
            className="mono w-full rounded border border-stgBorderStrong bg-stgSurface px-3 py-2.5 text-sm text-stgTextPrimary placeholder:text-stgTextMuted focus:outline-none focus:border-stgOrange resize-none"
          />
        </div>
      )}

      {file && (
        <Button onClick={runMultiTechnique} disabled={isRunning}>
          {isRunning ? 'Attempting extraction…' : 'Run multi-technique extraction'}
        </Button>
      )}

      {attempts.length > 0 && (
        <div className="border border-stgBorder rounded bg-stgSurface">
          {attempts.map((a, i) => (
            <div key={i} className="px-4 py-2.5 border-b border-stgBorder last:border-0 text-sm">
              <div className="flex items-center justify-between">
                <span className="mono text-xs text-stgTextPrimary">{a.technique}</span>
                <span
                  className={`mono text-xs ${
                    a.status === 'success'
                      ? 'text-stgSuccess'
                      : a.status === 'failed'
                        ? 'text-stgDanger'
                        : 'text-stgWarning'
                  }`}
                >
                  {a.status}
                </span>
              </div>
              {a.result && (
                <pre className="mono text-xs mt-1.5 whitespace-pre-wrap break-words text-stgTextPrimary bg-stgBg rounded px-2 py-1.5">
                  {a.result}
                </pre>
              )}
              {a.errorMessage && <p className="text-xs text-stgTextMuted mt-1">{a.errorMessage}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}