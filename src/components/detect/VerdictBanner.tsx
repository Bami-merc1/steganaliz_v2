import type { VerdictLabel } from '../../detectors/types';

const STYLES: Record<VerdictLabel, { bar: string; text: string; badge: string }> = {
  CLEAN: {
    bar: 'bg-stgSuccess/10 border-stgSuccess/40',
    text: 'text-stgSuccess',
    badge: 'bg-stgSuccess text-white',
  },
  SUSPICIOUS: {
    bar: 'bg-stgWarning/10 border-stgWarning/40',
    text: 'text-stgWarning',
    badge: 'bg-stgWarning text-white',
  },
  STEGO: {
    bar: 'bg-stgDanger/10 border-stgDanger/40',
    text: 'text-stgDanger',
    badge: 'bg-stgDanger text-white',
  },
};

export default function VerdictBanner({ label, score }: { label: VerdictLabel; score: number }) {
  const s = STYLES[label];
  return (
    <div className={`flex items-center justify-between rounded border px-4 py-3 ${s.bar}`}>
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wide ${s.badge}`}>
          {label}
        </span>
        <span className={`text-sm font-medium ${s.text}`}>
          {label === 'STEGO'
            ? 'Strong evidence of embedded payload'
            : label === 'SUSPICIOUS'
              ? 'Statistical anomalies detected'
              : 'No significant anomalies detected'}
        </span>
      </div>
      <span className={`mono text-sm font-semibold ${s.text}`}>{score}%</span>
    </div>
  );
}