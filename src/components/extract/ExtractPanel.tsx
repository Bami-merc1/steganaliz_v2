import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';
import { getEnginesSupportingExtension, autoSelectEngine, type EngineEntry } from '../../engines/registry';
import { useHistoryStore } from '../../store/useHistoryStore';

export default function ExtractPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [availableEngines, setAvailableEngines] = useState<EngineEntry[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<EngineEntry | null>(null);
  const [password, setPassword] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMessage, setExtractedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const showPasswordField = needsPassword || selectedEngine?.requiresPassword;

  const handleFile = (f: File) => {
    setFile(f);
    const supported = getEnginesSupportingExtension(f.name);
    setAvailableEngines(supported);
    const defaultEngine = autoSelectEngine(f.name);
    setSelectedEngine(defaultEngine);
    setExtractedMessage(null);
    setErrorMessage(null);
    setNeedsPassword(false);
    setPassword('');
  };

  const handleSelectEngine = (engine: EngineEntry) => {
    setSelectedEngine(engine);
    setExtractedMessage(null);
    setErrorMessage(null);
    setNeedsPassword(false);
  };

  const handleExtract = async () => {
    if (!file || !selectedEngine) return;
    setIsExtracting(true);
    setErrorMessage(null);
    setExtractedMessage(null);
    try {
      const message = await selectedEngine.extract.extract(file, password || undefined);
      setExtractedMessage(message);
      addHistoryEntry({
        action: 'extract',
        fileName: file.name,
        detail: `${selectedEngine.label} · recovered ${new TextEncoder().encode(message).length} bytes`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extraction failed unexpectedly.';
      setErrorMessage(msg);
      if (msg.toLowerCase().includes('password')) {
        setNeedsPassword(true);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (!extractedMessage) return;
    await navigator.clipboard.writeText(extractedMessage);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Dropzone onFileSelected={handleFile} acceptedLabel="PNG, BMP, WAV, or any file (EOF-append)" />

      {file && availableEngines.length === 0 && (
        <p className="text-xs text-stgDanger">
          No extraction engine currently supports .{file.name.split('.').pop()}.
        </p>
      )}

      {file && availableEngines.length > 1 && (
        <div>
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
            TECHNIQUE
          </label>
          <div className="flex flex-wrap gap-2">
            {availableEngines.map((engine) => (
              <button
                key={engine.id}
                onClick={() => handleSelectEngine(engine)}
                className={`px-3 py-2 text-xs rounded border ${
                  selectedEngine?.id === engine.id
                    ? 'border-stgOrange bg-stgOrangeSoft/40 text-stgTextPrimary font-medium'
                    : 'border-stgBorderStrong text-stgTextSecondary hover:bg-stgSurface'
                }`}
              >
                {engine.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {file && selectedEngine && (
        <div className="border border-stgBorder rounded bg-stgSurface px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-stgTextPrimary truncate max-w-[70%]">{file.name}</span>
            <span className="mono text-xs text-stgTextMuted">{selectedEngine.technique}</span>
          </div>
        </div>
      )}

      {showPasswordField && (
        <div>
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={selectedEngine?.requiresPassword ? 'Required for this technique' : 'This payload may be encrypted'}
            className="w-full rounded border border-stgBorderStrong bg-stgSurface px-3 py-2.5 text-sm text-stgTextPrimary placeholder:text-stgTextMuted focus:outline-none focus:border-stgOrange"
          />
        </div>
      )}

      {errorMessage && <p className="text-xs text-stgDanger">{errorMessage}</p>}

      {file && selectedEngine && (
        <Button onClick={handleExtract} disabled={isExtracting}>
          {isExtracting ? 'Extracting…' : 'Extract payload'}
        </Button>
      )}

      {extractedMessage !== null && (
        <div>
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
            EXTRACTED MESSAGE
          </label>
          {/* Rendered as plain text, never as HTML - an extracted payload is
              untrusted input and must not be able to execute as markup. */}
          <pre className="mono w-full whitespace-pre-wrap break-words rounded border border-stgBorderStrong bg-stgSurface px-3 py-2.5 text-sm text-stgTextPrimary">
            {extractedMessage}
          </pre>
          <Button variant="secondary" onClick={handleCopy} className="mt-2">
            Copy to clipboard
          </Button>
        </div>
      )}
    </div>
  );
}