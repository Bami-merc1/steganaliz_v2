import type { VerdictLabel } from '../../detectors/types';

const STYLES: Record<VerdictLabel, string> = {
  CLEAN:      'bg-stgSuccess/10 border-stgSuccess/40 text-stgSuccess',
  SUSPICIOUS: 'bg-stgWarning/10 border-stgWarning/40 text-stgWarning',
  STEGO:      'bg-stgDanger/10  border-stgDanger/40  text-stgDanger',
};

export default function VerdictBanner({
  label,
  score,
}: {
  label: VerdictLabel;
  score: number;
}) {
  return (
    <div className={`flex items-center justify-between rounded border px-4 py-3 ${STYLES[label]}`}>
      <span className="font-bold text-sm tracking-wide">{label}</span>
      <span className="mono text-sm font-semibold">{score}% confidence</span>
    </div>
  );
}