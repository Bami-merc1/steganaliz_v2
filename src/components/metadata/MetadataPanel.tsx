import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';
import { stripMetadata, isMetadataStrippable } from '../../engines/metadataStrip';
import { formatBytes } from '../../utils/formatBytes';
import { useHistoryStore } from '../../store/useHistoryStore';

export default function MetadataPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isStripping, setIsStripping] = useState(false);
  const [result, setResult] = useState<{ originalSize: number; strippedSize: number; bytesRemoved: number; method: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const ext = file?.name.split('.').pop()?.toLowerCase() ?? '';
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
      const outExt = strippable ? 'png' : (file.name.split('.').pop() ?? 'bin');
      a.href = url;
      a.download = `${baseName}_stripped.${outExt}`;
      a.click();
      URL.revokeObjectURL(url);

      addHistoryEntry({
        action: 'metadata-strip',
        fileName: file.name,
        detail: stripResult.bytesRemoved > 0
          ? `Removed ${formatBytes(stripResult.bytesRemoved)} of metadata`
          : 'Re-encoded cleanly (no detectable metadata delta)',
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Stripping failed.');
    } finally {
      setIsStripping(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* What this does */}
      <div className="bg-white border border-stgBorder rounded px-4 py-3 text-sm space-y-1.5">
        <p className="font-semibold text-black">What metadata stripping does</p>
        <p className="text-stgTextSecondary text-xs leading-relaxed">
          For <strong>images (PNG, BMP, JPG, GIF)</strong>: re-encodes through a clean pixel buffer,
          permanently discarding EXIF data (GPS coordinates, camera model, timestamps),
          ICC colour profiles, XMP metadata, and any non-standard or appended chunk data.
          The output may be slightly larger than the input because PNG re-encoding
          is always lossless - the value is in removing hidden data, not file size reduction.
        </p>
        <p className="text-stgTextSecondary text-xs leading-relaxed">
          For <strong>other formats</strong>: format-specific stripping (PDF metadata dict,
          ID3 tags, DOCX core.xml) is on the roadmap. Currently passes through unchanged
          with a clear notice.
        </p>
      </div>

      <Dropzone
        onFileSelected={handleFile}
        acceptedLabel="PNG, BMP, JPG, JPEG, GIF, or any file (passthrough for others)"
      />

      {file && !strippable && (
        <div className="border border-stgWarning/40 bg-stgWarning/10 rounded px-4 py-2.5 text-xs text-stgWarning">
          <strong>.{ext}</strong> format-specific metadata stripping is not yet implemented.
          Running this will download the file <strong>unchanged</strong>. Only image files
          (PNG, BMP, JPG, GIF) are actively stripped.
        </div>
      )}

      {file && strippable && (
        <div className="border border-stgSuccess/40 bg-stgSuccess/10 rounded px-4 py-2.5 text-xs text-stgSuccess">
          This image will be re-encoded through a clean pixel buffer. EXIF, GPS, ICC profiles,
          XMP, and any non-standard chunks will be permanently removed.
        </div>
      )}

      {errorMessage && <p className="text-xs text-stgDanger">{errorMessage}</p>}

      {file && (
        <Button onClick={handleStrip} disabled={isStripping}>
          {isStripping ? 'Stripping…' : 'Strip metadata & download'}
        </Button>
      )}

      {result && (
        <div className="border border-stgBorder rounded bg-white px-4 py-3 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-stgTextSecondary">Original size</span>
            <span className="mono font-medium text-black">{formatBytes(result.originalSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stgTextSecondary">Output size</span>
            <span className="mono font-medium text-black">{formatBytes(result.strippedSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stgTextSecondary">Metadata removed</span>
            <span className={`mono font-medium ${result.bytesRemoved > 0 ? 'text-stgSuccess' : 'text-stgTextMuted'}`}>
              {result.bytesRemoved > 0 ? formatBytes(result.bytesRemoved) : 'None detectable'}
            </span>
          </div>
          {result.strippedSize > result.originalSize && (
            <p className="text-xs text-stgTextMuted pt-1 border-t border-stgBorder">
              Output is larger than input - this is normal for PNG re-encoding. The image content
              is identical; the increase reflects PNG's lossless compression of the clean pixel buffer.
            </p>
          )}
          <div className="pt-1.5 border-t border-stgBorder text-xs text-stgTextMuted">
            {result.method}
          </div>
        </div>
      )}
    </div>
  );
}