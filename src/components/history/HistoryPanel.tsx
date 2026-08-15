import { useHistoryStore } from '../../store/useHistoryStore';
import Button from '../shared/Button';

const ACTION_LABELS: Record<string, string> = {
  embed: 'Embed',
  extract: 'Extract',
  detect: 'Detect',
  'batch-embed': 'Batch embed',
  'batch-detect': 'Batch detect',
  'metadata-strip': 'Metadata strip',
};

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function HistoryPanel() {
  const entries = useHistoryStore((s) => s.entries);
  const clear = useHistoryStore((s) => s.clear);

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-stgTextSecondary">
          No actions recorded yet this session. Embed, extract, or detect activity will appear
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stgTextMuted mono">
          {entries.length} action{entries.length === 1 ? '' : 's'} this session
        </p>
        <Button variant="secondary" onClick={clear}>
          Clear history
        </Button>
      </div>

      <div className="border border-stgBorder rounded bg-stgSurface">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between px-4 py-3 border-b border-stgBorder last:border-0 text-sm"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-stgTextPrimary">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-stgTextSecondary truncate">{entry.fileName}</span>
              </div>
              <p className="text-xs text-stgTextMuted mt-0.5">{entry.detail}</p>
            </div>
            <span className="mono text-xs text-stgTextMuted whitespace-nowrap ml-4">
              {formatTimestamp(entry.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}