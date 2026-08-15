import type { DetectorResult } from '../../detectors/types';

const DOT_COLOR: Record<string, string> = {
  CLEAN: 'bg-stgSuccess',
  SUSPICIOUS: 'bg-stgWarning',
  STEGO: 'bg-stgDanger',
};

export default function DetectorResultRow({ detectorName, score, label }: DetectorResult) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-stgBorder last:border-0 text-sm">
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full ${DOT_COLOR[label]}`} />
        <span className="text-stgTextPrimary">{detectorName}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="mono text-xs text-stgTextMuted">{label}</span>
        <span className="mono text-xs text-stgTextSecondary w-10 text-right">{score}%</span>
      </div>
    </div>
  );
}