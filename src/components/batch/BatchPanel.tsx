import { useState, useRef } from 'react';
import { zipSync, type Zippable } from 'fflate';
import Button from '../shared/Button';
import BatchFileRow, { type BatchItem } from './BatchFileRow';
import { computeVerdict } from '../../detectors/verdictEngine';
import { MOCK_DETECTORS } from '../../detectors/mockDetectors';
import { autoSelectEngine } from '../../engines/registry';
import { useHistoryStore } from '../../store/useHistoryStore';
import { MAX_BATCH_FILES } from '../../utils/constants';

type BatchMode = 'embed' | 'detect';

export default function BatchPanel() {
  const [mode, setMode] = useState<BatchMode>('detect');
  const [items, setItems] = useState<BatchItem[]>([]);
  const [message, setMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList).slice(0, MAX_BATCH_FILES - items.length);
    const newItems: BatchItem[] = incoming.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
    }));
    setItems((prev) => [...prev, ...newItems].slice(0, MAX_BATCH_FILES));
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearAll = () => setItems([]);

  const runBatch = async () => {
    if (items.length === 0) return;
    setIsRunning(true);

    const zipEntries: Zippable = {};
    let embedSuccessCount = 0;

    for (const item of items) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'processing' } : i))
      );

      try {
        if (mode === 'detect') {
          const result = await computeVerdict(item.file, MOCK_DETECTORS);
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: 'done', resultLabel: result.overallLabel, resultScore: result.overallScore }
                : i
            )
          );
        } else {
          const engine = autoSelectEngine(item.file.name);

          if (!engine) {
            throw new Error(`No embedding engine supports .${item.file.name.split('.').pop()}`);
          }

          if (!message) throw new Error('No message set for batch embed');

          const result = await engine.embed.embed(item.file, message);
          const buffer = new Uint8Array(await result.blob.arrayBuffer());

          const dot = item.file.name.lastIndexOf('.');
          const baseName = dot >= 0 ? item.file.name.slice(0, dot) : item.file.name;
          const outExt = ['png-lsb-sequential', 'png-lsb-randomized'].includes(engine.id)
            ? 'png'
            : (item.file.name.split('.').pop() ?? 'bin');

          let entryName = `${baseName}_stego.${outExt}`;
          let suffix = 1;
          while (zipEntries[entryName]) {
            entryName = `${baseName}_stego_${suffix++}.${outExt}`;
          }
          zipEntries[entryName] = buffer;
          embedSuccessCount++;

          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: 'done' } : i))
          );
        }
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  errorMessage: err instanceof Error ? err.message : 'Failed',
                }
              : i
          )
        );
      }
    }

    if (mode === 'embed' && embedSuccessCount > 0) {
      const zipped = zipSync(zipEntries, { level: 6 });
      const zipBlob = new Blob([zipped], { type: 'application/zip' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `steganaliz_batch_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }

    addHistoryEntry({
      action: mode === 'embed' ? 'batch-embed' : 'batch-detect',
      fileName: `${items.length} files`,
      detail:
        mode === 'embed'
          ? `${embedSuccessCount} of ${items.length} embedded → downloaded as zip`
          : 'Batch detect completed',
    });

    setIsRunning(false);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex gap-2">
        {(['detect', 'embed'] as BatchMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm rounded border capitalize ${
              mode === m
                ? 'border-stgOrange bg-stgOrangeSoft text-black font-semibold'
                : 'border-stgBorderStrong text-stgTextSecondary hover:bg-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'embed' && (
        <div>
          <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
            MESSAGE (applied to every file — EOF-append used for non-image formats)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type the message to conceal…"
            rows={3}
            className="mono w-full rounded border border-stgBorderStrong bg-white px-3 py-2.5 text-sm text-black placeholder:text-stgTextMuted focus:outline-none focus:border-stgOrange resize-none"
          />
          <p className="text-xs text-stgTextMuted mt-1">
            PNG/BMP → LSB substitution · WAV → audio LSB · All other formats → EOF-append
          </p>
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        className="border border-dashed rounded px-6 py-8 text-center text-sm cursor-pointer border-stgBorderStrong bg-white text-stgTextSecondary hover:border-stgOrange/60"
      >
        Click to add files — any format ({items.length}/{MAX_BATCH_FILES})
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <>
          <div className="border border-stgBorder rounded bg-white max-h-80 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <BatchFileRow item={item} />
                {item.status === 'pending' && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stgTextMuted hover:text-stgDanger opacity-0 group-hover:opacity-100"
                  >
                    remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={runBatch} disabled={isRunning || (mode === 'embed' && !message)}>
              {isRunning ? 'Processing…' : `Run batch ${mode}`}
            </Button>
            <Button variant="secondary" onClick={clearAll} disabled={isRunning}>
              Clear all
            </Button>
          </div>
        </>
      )}
    </div>
  );
}