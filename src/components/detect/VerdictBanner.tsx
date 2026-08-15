import type { VerdictLabel } from '../../detectors/types';

const LABEL_STYLES: Record<VerdictLabel, string> = {
  CLEAN: 'bg-stgSuccess/10 border-stgSuccess text-stgSuccess',
  SUSPICIOUS: 'bg-stgWarning/10 border-stgWarning text-stgWarning',
  STEGO: 'bg-stgDanger/10 border-stgDanger text-stgDanger',
};

interface Props {
  label: VerdictLabel;
  score: number;
}

export default function VerdictBanner({ label, score }: Props) {
  return (
    <div className={`flex items-center justify-between rounded border px-4 py-3 ${LABEL_STYLES[label]}`}>
      <span className="font-semibold text-sm tracking-wide">{label}</span>
      <span className="mono text-sm">{score}% confidence</span>
    </div>
  );
}