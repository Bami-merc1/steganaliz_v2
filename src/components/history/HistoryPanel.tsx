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

const ACTION_COLORS: Record<string, string> = {
  embed: 'text-stgOrange',
  extract: 'text-stgSuccess',
  detect: 'text-stgWarning',
  'batch-embed': 'text-stgOrange',
  'batch-detect': 'text-stgWarning',
  'metadata-strip': 'text-stgTextMuted',
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
        <div className="bg-stgSurface border border-stgBorder rounded px-6 py-10 text-center">
          <p className="text-stgTextMuted text-sm">No actions recorded yet this session.</p>
          <p className="text-stgTextMuted text-xs mt-1">Embed, extract, or detect activity will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="mono text-xs text-stgTextMuted">
          {entries.length} action{entries.length === 1 ? '' : 's'} this session
        </p>
        <Button variant="secondary" onClick={clear}>
          Clear history
        </Button>
      </div>

      <div className="bg-stgSurface border border-stgBorder rounded overflow-hidden">
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between px-4 py-3 text-sm ${
              i < entries.length - 1 ? 'border-b border-stgBorder' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${ACTION_COLORS[entry.action] ?? 'text-stgTextMuted'}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-stgTextSecondary truncate text-xs">{entry.fileName}</span>
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