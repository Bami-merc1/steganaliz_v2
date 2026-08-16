import { useState, useMemo, useEffect } from 'react';
import Dropzone from '../shared/Dropzone';
import FileInfoCard from '../shared/FileInfoCard';
import Checkbox from '../shared/Checkbox';
import Button from '../shared/Button';
import {
  autoSelectEngine,
  getEnginesSupportingExtension,
  type EngineEntry,
} from '../../engines/registry';
import { useHistoryStore } from '../../store/useHistoryStore';
import { formatBytes } from '../../utils/formatBytes';
import { validateCarrierFile } from '../../utils/fileValidation';
import { sanitizeSvgFile } from '../../utils/svgSanitizer';
import { checkRateLimit, RATE_LIMITS } from '../../utils/rateLimit';

export default function EmbedPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [availableEngines, setAvailableEngines] = useState<EngineEntry[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<EngineEntry | null>(null);
  const [capacity, setCapacity] = useState(0);
  const [message, setMessage] = useState('');
  const [encrypt, setEncrypt] = useState(true);
  const [password, setPassword] = useState('');
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const messageBytes = useMemo(
    () => new TextEncoder().encode(message).length,
    [message]
  );

  const overCapacity = selectedEngine
    ? !selectedEngine.isUnlimitedCapacity && messageBytes > capacity
    : false;

  const passwordRequired = selectedEngine?.requiresPassword || encrypt;
  const passwordValid = !passwordRequired || password.length >= 8;

  const canEmbed =
    !!file &&
    !!selectedEngine &&
    message.length > 0 &&
    !overCapacity &&
    passwordValid;

  useEffect(() => {
    if (!selectedEngine || !file || selectedEngine.isUnlimitedCapacity) {
      setCapacity(0);
      return;
    }
    let cancelled = false;
    selectedEngine.embed.getCapacityBytes(file).then((cap) => {
      if (!cancelled) setCapacity(cap);
    });
    return () => { cancelled = true; };
  }, [selectedEngine, file]);

  const handleFile = async (f: File) => {
    setErrorMessage(null);

    const validation = await validateCarrierFile(f);
    if (!validation.valid) {
      setErrorMessage(validation.reason ?? 'File validation failed.');
      return;
    }

    const safeFile = await sanitizeSvgFile(f);
    const supported = getEnginesSupportingExtension(safeFile.name);
    setAvailableEngines(supported);
    const defaultEngine = autoSelectEngine(safeFile.name);
    setSelectedEngine(defaultEngine);
    setFile(safeFile);
    if (defaultEngine?.requiresPassword) setEncrypt(true);
  };

  const handleSelectEngine = (engine: EngineEntry) => {
    setSelectedEngine(engine);
    setErrorMessage(null);
    if (engine.requiresPassword) setEncrypt(true);
  };

  const handleEmbed = async () => {
    if (!file || !selectedEngine || !canEmbed) return;

    if (!checkRateLimit('embed', RATE_LIMITS.embed.maxCalls, RATE_LIMITS.embed.windowMs)) {
      setErrorMessage('Rate limit reached — please wait a moment before embedding again.');
      return;
    }

    setIsEmbedding(true);
    setErrorMessage(null);

    try {
      const usePassword = selectedEngine.requiresPassword || encrypt;
      const result = await selectedEngine.embed.embed(
        file,
        message,
        usePassword ? password : undefined
      );

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      const dot = file.name.lastIndexOf('.');
      const baseName = dot >= 0 ? file.name.slice(0, dot) : file.name;
      const lsbPixelEngines = ['png-lsb-sequential', 'png-lsb-randomized'];
      const outExt = lsbPixelEngines.includes(selectedEngine.id)
        ? 'png'
        : (file.name.split('.').pop() ?? 'bin');
      a.href = url;
      a.download = `${baseName}_stego.${outExt}`;
      a.click();
      URL.revokeObjectURL(url);

      addHistoryEntry({
        action: 'embed',
        fileName: file.name,
        detail: `${selectedEngine.label} · ${result.capacityUsedBytes} bytes${usePassword ? ' · encrypted' : ''}`,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Embedding failed unexpectedly.'
      );
    } finally {
      setIsEmbedding(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Dropzone
        onFileSelected={handleFile}
        acceptedLabel="PNG, BMP, WAV, or any file (EOF-append)"
      />

      {file && availableEngines.length === 0 && (
        <p className="text-xs text-stgDanger">
          No embedding engine currently supports .{file.name.split('.').pop()}.
        </p>
      )}

      {file && availableEngines.length > 0 && (
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
        selectedEngine.isUnlimitedCapacity ? (
          <div className="border border-stgBorder rounded bg-stgSurface px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stgTextPrimary truncate max-w-[60%]">
                {file.name}
              </span>
              <span className="mono text-xs text-stgTextMuted">{formatBytes(file.size)}</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-stgTextSecondary">
              <span>
                Technique: <span className="mono">{selectedEngine.technique}</span>
              </span>
              <span className="text-stgTextMuted">
                No capacity limit — {formatBytes(messageBytes)} used
              </span>
            </div>
          </div>
        ) : (
          <FileInfoCard
            fileName={file.name}
            fileSize={file.size}
            technique={selectedEngine.technique}
            capacityBytes={capacity}
            messageBytesUsed={messageBytes}
          />
        )
      )}

      <div>
        <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
          SECRET MESSAGE
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type the message to conceal…"
          rows={5}
          className="mono w-full rounded border border-stgBorderStrong bg-stgSurface px-3 py-2.5 text-sm text-stgTextPrimary placeholder:text-stgTextMuted focus:outline-none focus:border-stgOrange resize-none"
        />
        {overCapacity && (
          <p className="text-xs text-stgDanger mt-1">
            Message exceeds carrier capacity for this technique.
          </p>
        )}
      </div>

      {selectedEngine?.requiresPassword ? (
        <p className="text-xs text-stgTextMuted">
          This technique requires a password — it derives the pixel embedding
          order, not just encryption.
        </p>
      ) : (
        <Checkbox
          checked={encrypt}
          onChange={setEncrypt}
          label="Encrypt payload with AES-256-GCM (PBKDF2-SHA256, 310,000 iterations)"
        />
      )}

      {(encrypt || selectedEngine?.requiresPassword) && (
        <div>
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full rounded border border-stgBorderStrong bg-stgSurface px-3 py-2.5 text-sm text-stgTextPrimary placeholder:text-stgTextMuted focus:outline-none focus:border-stgOrange"
          />
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs text-stgDanger mt-1">
              Password must be at least 8 characters.
            </p>
          )}
        </div>
      )}

      {errorMessage && <p className="text-xs text-stgDanger">{errorMessage}</p>}

      <Button onClick={handleEmbed} disabled={!canEmbed || isEmbedding}>
        {isEmbedding ? 'Embedding…' : 'Embed & download'}
      </Button>
    </div>
  );
}