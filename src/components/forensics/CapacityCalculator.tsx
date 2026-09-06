import { useState } from 'react';
import { formatBytes } from '../../utils/formatBytes';

interface Row {
  format: string;
  technique: string;
  formula: string;
  example: string;
  exampleCapacity: string;
}

const ROWS: Row[] = [
  { format: 'PNG / BMP', technique: 'LSB sequential / randomized', formula: 'floor((pixels × 3 − 40) / 8)', example: '1920×1080', exampleCapacity: formatBytes(Math.floor((1920*1080*3-40)/8)) },
  { format: 'PNG',       technique: 'Metadata chunk injection',    formula: 'Unlimited (no pixel limit)',   example: 'Any size',    exampleCapacity: 'Unlimited' },
  { format: 'JPEG',      technique: 'COM marker injection',        formula: 'Up to ~64 KB per COM segment', example: 'Any JPEG',   exampleCapacity: '~64 KB' },
  { format: 'WAV (16-bit PCM)', technique: 'LSB audio samples', formula: 'floor((samples − 40) / 8)', example: '44.1 kHz stereo, 60 s', exampleCapacity: formatBytes(Math.floor((44100*2*60-40)/8)) },
  { format: 'PDF',       technique: 'XMP metadata injection',      formula: 'Unlimited (metadata field)',   example: 'Any PDF',    exampleCapacity: 'Unlimited' },
  { format: 'DOCX / PPTX / ODT', technique: 'Custom XML part', formula: 'Unlimited (separate XML file in ZIP)', example: 'Any document', exampleCapacity: 'Unlimited' },
  { format: 'TXT / MD / HTML', technique: 'Zero-width characters', formula: 'floor(text_bytes / 6)', example: '10 KB text file', exampleCapacity: formatBytes(Math.floor(10240/6)) },
  { format: 'Any format', technique: 'EOF append',                 formula: 'Unlimited (appended after file end)', example: 'Any file', exampleCapacity: 'Unlimited' },
];

export default function CapacityCalculator() {
  const [pixels, setPixels] = useState({ w: 1920, h: 1080 });
  const [wavSeconds, setWavSeconds] = useState(60);
  const [textKB, setTextKB] = useState(10);

  const lsbCapacity = Math.max(0, Math.floor((pixels.w * pixels.h * 3 - 40) / 8));
  const wavCapacity  = Math.max(0, Math.floor((44100 * 2 * wavSeconds - 40) / 8));
  const zwCapacity   = Math.max(0, Math.floor((textKB * 1024) / 6));

  return (
    <div className="space-y-6">
      <p className="text-sm text-stgTextSecondary leading-relaxed">
        Capacity depends on the carrier file's dimensions and the technique used.
        Use the calculators below for quick estimates, or refer to the reference table.
      </p>

      {/* Interactive calculators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* PNG/BMP LSB */}
        <div className="border border-stgBorder rounded bg-white px-4 py-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide text-black">PNG / BMP — LSB</p>
          <div className="flex gap-2">
            <div>
              <label className="text-xs text-stgTextMuted">Width px</label>
              <input type="number" value={pixels.w} min={1} max={20000}
                onChange={(e) => setPixels((p) => ({ ...p, w: +e.target.value }))}
                className="mono w-full border border-stgBorderStrong rounded px-2 py-1 text-sm text-black bg-stgBg" />
            </div>
            <div>
              <label className="text-xs text-stgTextMuted">Height px</label>
              <input type="number" value={pixels.h} min={1} max={20000}
                onChange={(e) => setPixels((p) => ({ ...p, h: +e.target.value }))}
                className="mono w-full border border-stgBorderStrong rounded px-2 py-1 text-sm text-black bg-stgBg" />
            </div>
          </div>
          <p className="text-xs text-stgTextMuted">Capacity:</p>
          <p className="mono text-lg font-bold text-stgOrange">{formatBytes(lsbCapacity)}</p>
        </div>

        {/* WAV LSB */}
        <div className="border border-stgBorder rounded bg-white px-4 py-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide text-black">WAV — LSB (16-bit stereo)</p>
          <div>
            <label className="text-xs text-stgTextMuted">Duration (seconds)</label>
            <input type="number" value={wavSeconds} min={1} max={3600}
              onChange={(e) => setWavSeconds(+e.target.value)}
              className="mono w-full border border-stgBorderStrong rounded px-2 py-1 text-sm text-black bg-stgBg" />
          </div>
          <p className="text-xs text-stgTextMuted">Capacity at 44.1 kHz stereo:</p>
          <p className="mono text-lg font-bold text-stgOrange">{formatBytes(wavCapacity)}</p>
        </div>

        {/* Zero-width text */}
        <div className="border border-stgBorder rounded bg-white px-4 py-4 space-y-3">
          <p className="text-xs font-semibold tracking-wide text-black">Text — Zero-width characters</p>
          <div>
            <label className="text-xs text-stgTextMuted">Carrier file size (KB)</label>
            <input type="number" value={textKB} min={1} max={10000}
              onChange={(e) => setTextKB(+e.target.value)}
              className="mono w-full border border-stgBorderStrong rounded px-2 py-1 text-sm text-black bg-stgBg" />
          </div>
          <p className="text-xs text-stgTextMuted">Capacity (base-3 encoding):</p>
          <p className="mono text-lg font-bold text-stgOrange">{formatBytes(zwCapacity)}</p>
        </div>
      </div>

      {/* Reference table */}
      <div>
        <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-2">ALL TECHNIQUES — REFERENCE</p>
        <div className="border border-stgBorder rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-stgBg border-b border-stgBorder">
                {['Format', 'Technique', 'Formula', 'Example capacity'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-stgTextMuted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.format + r.technique} className="border-b border-stgBorder last:border-0">
                  <td className="px-3 py-2 font-medium text-black">{r.format}</td>
                  <td className="px-3 py-2 text-stgTextSecondary">{r.technique}</td>
                  <td className="px-3 py-2 mono text-stgTextMuted">{r.formula}</td>
                  <td className="px-3 py-2 mono font-semibold text-stgOrange">{r.exampleCapacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}