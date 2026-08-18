import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';

const BLOCK_SIZE = 16;
const SUPPORTED = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'];

function shannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const freq = new Uint32Array(256);
  for (const b of bytes) freq[b]++;
  let e = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] === 0) continue;
    const p = freq[i] / bytes.length;
    e -= p * Math.log2(p);
  }
  return e;
}

function entropyToRgb(entropy: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, entropy / 8));
  if (t < 0.25) {
    const s = t / 0.25;
    return [0, Math.round(s * 80), Math.round(139 + s * 116)];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, Math.round(80 + s * 175), Math.round(255 - s * 255)];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [Math.round(s * 255), 255, 0];
  } else {
    const s = (t - 0.75) / 0.25;
    return [255, Math.round(255 - s * 255), 0];
  }
}

interface HeatmapResult {
  originalDataUrl: string;
  heatmapDataUrl: string;
  min: number;
  max: number;
  mean: number;
  blockCount: number;
}

export default function EntropyHeatmap() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HeatmapResult | null>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED.includes(ext)) {
      setError(`Entropy heatmap requires a raster image (PNG, JPG, BMP, GIF, WEBP). ".${ext}" cannot be decoded to pixel data.`);
      setFile(null);
      setResult(null);
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  };

  const runHeatmap = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const bitmap = await createImageBitmap(file);
      const w = bitmap.width;
      const h = bitmap.height;

      // Canvas 1 - original image
      const origCanvas = document.createElement('canvas');
      origCanvas.width = w;
      origCanvas.height = h;
      const origCtx = origCanvas.getContext('2d')!;
      origCtx.drawImage(bitmap, 0, 0);
      const imageData = origCtx.getImageData(0, 0, w, h);
      const pixels = new Uint8Array(imageData.data.buffer);

      // Canvas 2 - heatmap
      const heatCanvas = document.createElement('canvas');
      heatCanvas.width = w;
      heatCanvas.height = h;
      const heatCtx = heatCanvas.getContext('2d')!;
      const heatImageData = heatCtx.createImageData(w, h);
      const heatData = heatImageData.data;

      const blocksX = Math.ceil(w / BLOCK_SIZE);
      const blocksY = Math.ceil(h / BLOCK_SIZE);
      const entropies: number[] = [];

      for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
          const x0 = bx * BLOCK_SIZE;
          const y0 = by * BLOCK_SIZE;
          const x1 = Math.min(x0 + BLOCK_SIZE, w);
          const y1 = Math.min(y0 + BLOCK_SIZE, h);

          const block: number[] = [];
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const i = (y * w + x) * 4;
              block.push(pixels[i], pixels[i + 1], pixels[i + 2]);
            }
          }

          const ent = shannonEntropy(new Uint8Array(block));
          entropies.push(ent);
          const [r, g, b] = entropyToRgb(ent);

          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const i = (y * w + x) * 4;
              heatData[i]     = r;
              heatData[i + 1] = g;
              heatData[i + 2] = b;
              heatData[i + 3] = 255;
            }
          }
        }
      }

      heatCtx.putImageData(heatImageData, 0, 0);

      const min  = Math.min(...entropies);
      const max  = Math.max(...entropies);
      const mean = entropies.reduce((a, b) => a + b, 0) / entropies.length;

      setResult({
        originalDataUrl: origCanvas.toDataURL('image/png'),
        heatmapDataUrl:  heatCanvas.toDataURL('image/png'),
        min, max, mean,
        blockCount: entropies.length,
      });
    } catch (err) {
      setError(
        `Could not analyse image: ${err instanceof Error ? err.message : 'unknown error'}. ` +
        `Try a different PNG or JPG file.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      <Dropzone onFileSelected={handleFile} acceptedLabel="PNG, JPG, BMP, GIF, WEBP" />

      {error && <p className="text-xs text-stgDanger">{error}</p>}

      {file && !error && (
        <Button onClick={runHeatmap} disabled={isAnalyzing}>
          {isAnalyzing ? 'Analysing…' : 'Generate entropy heatmap'}
        </Button>
      )}

      {isAnalyzing && (
        <div className="flex items-center gap-2 text-xs text-stgTextMuted">
          <span className="animate-spin inline-block w-3 h-3 border border-stgOrange border-t-transparent rounded-full" />
          Computing per-block Shannon entropy…
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Min entropy',  value: result.min.toFixed(3)  },
              { label: 'Mean entropy', value: result.mean.toFixed(3) },
              { label: 'Max entropy',  value: result.max.toFixed(3)  },
            ].map(({ label, value }) => (
              <div key={label} className="border border-stgBorder rounded bg-white px-3 py-2">
                <p className="text-xs text-stgTextMuted">{label}</p>
                <p className="mono text-sm font-semibold text-black">
                  {value}
                  <span className="text-xs font-normal text-stgTextMuted ml-1">bits/byte</span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-stgTextMuted whitespace-nowrap">Low entropy</span>
            <div
              className="flex-1 h-3 rounded"
              style={{
                background:
                  'linear-gradient(to right,#00008b,#0050cc,#00cc88,#ffff00,#ff0000)',
              }}
            />
            <span className="text-xs text-stgTextMuted whitespace-nowrap">High entropy</span>
          </div>

          <p className="text-xs text-stgTextMuted">
            {result.blockCount} blocks analysed ({BLOCK_SIZE}×{BLOCK_SIZE}px each).
            High-entropy regions (warm colours) may indicate embedded or encrypted data.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-stgTextMuted mb-1.5">Original image</p>
              <img
                src={result.originalDataUrl}
                alt="Original"
                className="w-full rounded border border-stgBorder"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div>
              <p className="text-xs text-stgTextMuted mb-1.5">Entropy heatmap</p>
              <img
                src={result.heatmapDataUrl}
                alt="Entropy heatmap"
                className="w-full rounded border border-stgBorder"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}