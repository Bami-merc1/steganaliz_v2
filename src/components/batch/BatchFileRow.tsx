import { formatBytes } from '../../utils/formatBytes';
import type { VerdictLabel } from '../../detectors/types';

export interface BatchItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  resultLabel?: VerdictLabel;
  resultScore?: number;
  errorMessage?: string;
}

const STATUS_STYLES: Record<BatchItem['status'], string> = {
  pending: 'text-stgTextMuted',
  processing: 'text-stgWarning',
  done: 'text-stgSuccess',
  error: 'text-stgDanger',
};

const VERDICT_DOT: Record<VerdictLabel, string> = {
  CLEAN: 'bg-stgSuccess',
  SUSPICIOUS: 'bg-stgWarning',
  STEGO: 'bg-stgDanger',
};

export default function BatchFileRow({ item }: { item: BatchItem }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-stgBorder last:border-0 text-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        {item.resultLabel && (
          <span className={`w-2 h-2 rounded-full shrink-0 ${VERDICT_DOT[item.resultLabel]}`} />
        )}
        <span className="text-stgTextPrimary truncate">{item.file.name}</span>
        <span className="mono text-xs text-stgTextMuted shrink-0">{formatBytes(item.file.size)}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {item.status === 'error' && (
          <span className="text-xs text-stgDanger">{item.errorMessage}</span>
        )}
        {item.status === 'done' && item.resultLabel && (
          <span className="mono text-xs text-stgTextSecondary">
            {item.resultLabel} · {item.resultScore}%
          </span>
        )}
        <span className={`mono text-xs capitalize ${STATUS_STYLES[item.status]}`}>{item.status}</span>
      </div>
    </div>
  );
}