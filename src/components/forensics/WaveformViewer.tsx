import { useState } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';

const SUPPORTED = ['wav', 'mp3'];

interface WaveformResult {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  channels: number;
}

export default function WaveformViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<WaveformResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED.includes(ext)) {
      setError(`Waveform viewer supports WAV and MP3 only. ".${ext}" is not supported.`);
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  };

  const analyse = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const samples = decoded.getChannelData(0); // left / mono channel
      setResult({
        samples,
        sampleRate: decoded.sampleRate,
        duration: decoded.duration,
        channels: decoded.numberOfChannels,
      });
      audioCtx.close();
    } catch (e) {
      setError(`Could not decode audio: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const drawWaveform = (canvas: HTMLCanvasElement | null) => {
    if (!canvas || !result) return;
    const { samples } = result;
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    const step = Math.max(1, Math.floor(samples.length / W));
    ctx.strokeStyle = '#e8542a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const s = samples[x * step + j] ?? 0;
        if (s < min) min = s;
        if (s > max) max = s;
      }
      const yMin = ((1 - min) / 2) * H;
      const yMax = ((1 - max) / 2) * H;
      ctx.moveTo(x, yMin);
      ctx.lineTo(x, yMax);
    }
    ctx.stroke();

    // Centre line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
  };

  return (
    <div className="space-y-5">
      <Dropzone onFileSelected={handleFile} acceptedLabel="WAV, MP3" />
      {error && <p className="text-xs text-stgDanger">{error}</p>}
      {file && !error && (
        <Button onClick={analyse} disabled={isAnalyzing}>
          {isAnalyzing ? 'Decoding audio…' : 'Generate waveform'}
        </Button>
      )}
      {result && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Duration',    value: `${result.duration.toFixed(2)}s` },
              { label: 'Sample rate', value: `${(result.sampleRate / 1000).toFixed(1)} kHz` },
              { label: 'Channels',    value: result.channels === 1 ? 'Mono' : 'Stereo' },
            ].map(({ label, value }) => (
              <div key={label} className="border border-stgBorder rounded bg-white px-3 py-2">
                <p className="text-xs text-stgTextMuted">{label}</p>
                <p className="mono text-sm font-semibold text-black">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-stgTextMuted">
            Waveform shows channel 1 amplitude over time. LSB-embedded audio typically looks
            identical to clean audio visually — use the Detect tab for statistical analysis.
          </p>
          <canvas
            ref={drawWaveform}
            width={800}
            height={160}
            className="w-full rounded border border-stgBorder"
            style={{ background: '#0d1117' }}
          />
        </>
      )}
    </div>
  );
}