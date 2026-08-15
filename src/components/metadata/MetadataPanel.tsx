import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';
import { stripMetadata, isMetadataStrippable, type MetadataStripResult } from '../../engines/metadataStrip';
import { formatBytes } from '../../utils/formatBytes';
import { useHistoryStore } from '../../store/useHistoryStore';

export default function MetadataPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isStripping, setIsStripping] = useState(false);
  const [result, setResult] = useState<MetadataStripResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const strippable = file ? isMetadataStrippable(file.name) : false;

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setErrorMessage(null);
  };

  const handleStrip = async () => {
    if (!file) return;
    setIsStripping(true);
    setErrorMessage(null);
    try {
      const stripResult = await stripMetadata(file);
      setResult(stripResult);

      const url = URL.createObjectURL(stripResult.blob);
      const a = document.createElement('a');
      const dot = file.name.lastIndexOf('.');
      const baseName = dot >= 0 ? file.name.slice(0, dot) : file.name;
      const downloadExt = strippable ? 'png' : (file.name.split('.').pop() ?? 'bin');
      a.href = url;
      a.download = `${baseName}_stripped.${downloadExt}`;
      a.click();
      URL.revokeObjectURL(url);

      addHistoryEntry({
        action: 'metadata-strip',
        fileName: file.name,
        detail:
          stripResult.bytesRemoved > 0
            ? `Removed ${formatBytes(stripResult.bytesRemoved)} of metadata`
            : 'No format-specific stripping available — file unchanged',
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Metadata stripping failed unexpectedly.');
    } finally {
      setIsStripping(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Dropzone onFileSelected={handleFile} acceptedLabel="any supported carrier format" />

      {file && !strippable && (
        <p className="text-xs text-stgWarning">
          Format-specific metadata stripping for .{file.name.split('.').pop()} isn't implemented
          yet — running this will download the file unchanged.
        </p>
      )}

      {file && strippable && (
        <p className="text-xs text-stgTextSecondary">
          Re-encodes the image through a clean pixel buffer, discarding EXIF, ICC profiles, XMP,
          and any trailing or embedded data outside the visible pixels.
        </p>
      )}

      {errorMessage && <p className="text-xs text-stgDanger">{errorMessage}</p>}

      {file && (
        <Button onClick={handleStrip} disabled={isStripping}>
          {isStripping ? 'Stripping…' : 'Strip metadata & download'}
        </Button>
      )}

      {result && (
        <div className="border border-stgBorder rounded bg-stgSurface px-4 py-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-stgTextSecondary">Original size</span>
            <span className="mono text-stgTextPrimary">{formatBytes(result.originalSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stgTextSecondary">Stripped size</span>
            <span className="mono text-stgTextPrimary">{formatBytes(result.strippedSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stgTextSecondary">Bytes removed</span>
            <span className={`mono ${result.bytesRemoved > 0 ? 'text-stgSuccess' : 'text-stgTextMuted'}`}>
              {formatBytes(result.bytesRemoved)}
            </span>
          </div>
          <div className="pt-1.5 border-t border-stgBorder text-xs text-stgTextMuted">
            {result.method}
          </div>
        </div>
      )}
    </div>
  );
}