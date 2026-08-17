import { useState, useRef } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';

const BLOCK_SIZE = 16;
const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'];

function entropyToColor(entropy: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, entropy / 8));
  if (t < 0.25) {
    const s = t / 0.25;
    return [0, Math.round(s * 100), Math.round(139 + s * 116)];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, Math.round(100 + s * 155), Math.round(255 - s * 255)];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [Math.round(s * 255), 255, 0];
  } else {
    const s = (t - 0.75) / 0.25;
    return [255, Math.round(255 - s * 255), 0];
  }
}

function shannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const freq = new Uint32Array(256);
  for (const b of bytes) freq[b]++;
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] === 0) continue;
    const p = freq[i] / bytes.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export default function EntropyHeatmap() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    min: number;
    max: number;
    mean: number;
    blockCount: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setErrorMessage(
        `Entropy heatmap requires a raster image (PNG, JPG, BMP, GIF, WEBP). ` +
        `".${ext}" files cannot be decoded to pixel data.`
      );
      setFile(null);
      setStats(null);
      return;
    }
    setErrorMessage(null);
    setFile(f);
    setStats(null);
  };

  const runHeatmap = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const bitmap = await createImageBitmap(file);
      const w = bitmap.width;
      const h = bitmap.height;

      // Draw original image
      const origCanvas = originalCanvasRef.current;
      if (!origCanvas) throw new Error('Canvas not available');
      origCanvas.width = w;
      origCanvas.height = h;
      const origCtx = origCanvas.getContext('2d');
      if (!origCtx) throw new Error('2D context unavailable');
      origCtx.drawImage(bitmap, 0, 0);
      const imageData = origCtx.getImageData(0, 0, w, h);
      const pixels = new Uint8Array(imageData.data.buffer);

      // Build heatmap
      const heatCanvas = canvasRef.current;
      if (!heatCanvas) throw new Error('Heatmap canvas not available');
      heatCanvas.width = w;
      heatCanvas.height = h;
      const heatCtx = heatCanvas.getContext('2d');
      if (!heatCtx) throw new Error('Heatmap context unavailable');
      const heatImageData = heatCtx.createImageData(w, h);
      const heatData = heatImageData.data;

      const blocksX = Math.ceil(w / BLOCK_SIZE);
      const blocksY = Math.ceil(h / BLOCK_SIZE);
      const blockEntropies: number[] = [];

      for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
          const x0 = bx * BLOCK_SIZE;
          const y0 = by * BLOCK_SIZE;
          const x1 = Math.min(x0 + BLOCK_SIZE, w);
          const y1 = Math.min(y0 + BLOCK_SIZE, h);

          const blockBytes: number[] = [];
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const idx = (y * w + x) * 4;
              blockBytes.push(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
            }
          }

          const entropy = shannonEntropy(new Uint8Array(blockBytes));
          blockEntropies.push(entropy);
          const [r, g, b] = entropyToColor(entropy);

          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const idx = (y * w + x) * 4;
              heatData[idx]     = r;
              heatData[idx + 1] = g;
              heatData[idx + 2] = b;
              heatData[idx + 3] = 255;
            }
          }
        }
      }

      heatCtx.putImageData(heatImageData, 0, 0);

      const min  = Math.min(...blockEntropies);
      const max  = Math.max(...blockEntropies);
      const mean = blockEntropies.reduce((a, b) => a + b, 0) / blockEntropies.length;
      setStats({ min, max, mean, blockCount: blockEntropies.length });
    } catch (err) {
      setErrorMessage(
        `Could not decode image: ${err instanceof Error ? err.message : 'unknown error'}. ` +
        `Try a PNG or JPG file.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      <Dropzone
        onFileSelected={handleFile}
        acceptedLabel="PNG, JPG, BMP, GIF, WEBP"
      />

      {errorMessage && (
        <p className="text-xs text-stgDanger">{errorMessage}</p>
      )}

      {file && !errorMessage && (
        <Button onClick={runHeatmap} disabled={isAnalyzing}>
          {isAnalyzing ? 'Analysing…' : 'Generate entropy heatmap'}
        </Button>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Min entropy', value: stats.min.toFixed(3) },
              { label: 'Mean entropy', value: stats.mean.toFixed(3) },
              { label: 'Max entropy', value: stats.max.toFixed(3) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="border border-stgBorder rounded bg-white px-3 py-2"
              >
                <p className="text-xs text-stgTextMuted">{label}</p>
                <p className="mono text-sm font-medium text-black">
                  {value} <span className="text-xs font-normal">bits/byte</span>
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
                  'linear-gradient(to right, #00008b, #0064ff, #00ff00, #ffff00, #ff0000)',
              }}
            />
            <span className="text-xs text-stgTextMuted whitespace-nowrap">High entropy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-stgTextMuted mb-1.5">Original image</p>
              <canvas
                ref={originalCanvasRef}
                className="w-full rounded border border-stgBorder"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div>
              <p className="text-xs text-stgTextMuted mb-1.5">
                Entropy heatmap ({BLOCK_SIZE}×{BLOCK_SIZE}px blocks ·{' '}
                {stats.blockCount} blocks)
              </p>
              <canvas
                ref={canvasRef}
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