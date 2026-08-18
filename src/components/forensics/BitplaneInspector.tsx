import { useState, useRef } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';

const CHANNELS = ['R', 'G', 'B'] as const;
type Channel = typeof CHANNELS[number];

export default function BitplaneInspector() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel>('R');
  const [selectedBit, setSelectedBit] = useState(0); // 0 = LSB, 7 = MSB
  const [isRendering, setIsRendering] = useState(false);
  const [anomalyScore, setAnomalyScore] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setAnomalyScore(null);
  };

  const renderBitplane = async () => {
    if (!file) return;
    setIsRendering(true);
    setAnomalyScore(null);

    try {
      const bitmap = await createImageBitmap(file);
      const w = bitmap.width;
      const h = bitmap.height;

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d')!;
      offCtx.drawImage(bitmap, 0, 0);
      const imageData = offCtx.getImageData(0, 0, w, h);
      const pixels = imageData.data;

      // Draw original
      const origCanvas = originalCanvasRef.current!;
      origCanvas.width = w;
      origCanvas.height = h;
      origCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

      const channelOffset = CHANNELS.indexOf(selectedChannel);
      const bitplane = new Uint8Array(w * h);
      let onesCount = 0;

      for (let i = 0; i < w * h; i++) {
        const channelValue = pixels[i * 4 + channelOffset];
        const bit = (channelValue >> selectedBit) & 1;
        bitplane[i] = bit;
        onesCount += bit;
      }

      // Anomaly detection: measure spatial correlation in the bitplane.
      // Natural LSBs have low correlation with their neighbours.
      // A large sequential payload creates a high-correlation rectangular region.
      let correlationSum = 0;
      let correlationCount = 0;
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const curr = bitplane[y * w + x];
          const right = bitplane[y * w + x + 1];
          const down = bitplane[(y + 1) * w + x];
          // XNOR: 1 when neighbours match (high = correlated = suspicious if at LSB)
          correlationSum += (1 - (curr ^ right)) + (1 - (curr ^ down));
          correlationCount += 2;
        }
      }
      const spatialCorrelation = correlationCount > 0
        ? correlationSum / correlationCount
        : 0.5;

      // For natural images, LSB spatial correlation is close to 0.5 (random).
      // After embedding, correlation in the embedded region rises toward 1 OR
      // drops toward 0 depending on payload content - either extreme is suspicious.
      // Score: deviation from 0.5 mapped to 0-100.
      const deviation = Math.abs(spatialCorrelation - 0.5) * 2;
      // Also factor in ratio of 1s vs 0s - true random is near 50/50.
      const biasDeviation = Math.abs((onesCount / (w * h)) - 0.5) * 2;
      const score = Math.round(Math.max(deviation, biasDeviation) * 100);
      setAnomalyScore(score);

      // Render bitplane as black/white
      const bitplaneCanvas = canvasRef.current!;
      bitplaneCanvas.width = w;
      bitplaneCanvas.height = h;
      const bpCtx = bitplaneCanvas.getContext('2d')!;
      const bpImageData = bpCtx.createImageData(w, h);
      const bpData = bpImageData.data;

      for (let i = 0; i < w * h; i++) {
        const v = bitplane[i] * 255;
        bpData[i * 4] = v;
        bpData[i * 4 + 1] = v;
        bpData[i * 4 + 2] = v;
        bpData[i * 4 + 3] = 255;
      }

      bpCtx.putImageData(bpImageData, 0, 0);
    } catch {
      // not a decodable image
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="space-y-5">
      <Dropzone onFileSelected={handleFile} acceptedLabel="PNG, BMP, JPG" />

      {file && (
        <>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
                CHANNEL
              </label>
              <div className="flex gap-2">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={`px-3 py-1.5 text-xs rounded border ${
                      selectedChannel === ch
                        ? 'border-stgOrange bg-stgOrangeSoft/40 text-stgTextPrimary font-medium'
                        : 'border-stgBorderStrong text-stgTextSecondary hover:bg-stgSurface'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1.5">
                BIT POSITION (0 = LSB, 7 = MSB)
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((bit) => (
                  <button
                    key={bit}
                    onClick={() => setSelectedBit(bit)}
                    className={`w-8 h-8 text-xs rounded border ${
                      selectedBit === bit
                        ? 'border-stgOrange bg-stgOrangeSoft/40 text-stgTextPrimary font-medium'
                        : 'border-stgBorderStrong text-stgTextSecondary hover:bg-stgSurface'
                    }`}
                  >
                    {bit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={renderBitplane} disabled={isRendering}>
            {isRendering ? 'Rendering…' : `Render ${selectedChannel} bitplane ${selectedBit}`}
          </Button>
        </>
      )}

      {anomalyScore !== null && (
        <div className={`border rounded px-4 py-2 text-sm ${
          anomalyScore >= 60
            ? 'border-stgDanger bg-stgDanger/10 text-stgDanger'
            : anomalyScore >= 30
              ? 'border-stgWarning bg-stgWarning/10 text-stgWarning'
              : 'border-stgSuccess bg-stgSuccess/10 text-stgSuccess'
        }`}>
          Spatial anomaly score: <span className="mono font-medium">{anomalyScore}%</span>
          {selectedBit === 0 && anomalyScore >= 40 && (
            <span className="text-xs ml-2 opacity-80">
              - LSB plane looks statistically non-natural. Consider running the full Detect suite.
            </span>
          )}
        </div>
      )}

      {file && (
        <div className="grid grid-cols-2 gap-4">
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
              {selectedChannel} channel, bit {selectedBit}
              {selectedBit === 0 ? ' (LSB)' : selectedBit === 7 ? ' (MSB)' : ''}
            </p>
            <canvas
              ref={canvasRef}
              className="w-full rounded border border-stgBorder"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}