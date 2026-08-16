import { formatBytes } from '../../utils/formatBytes';

interface Props {
  fileName: string;
  fileSize: number;
  technique: string;
  capacityBytes: number;
  messageBytesUsed: number;
}

export default function FileInfoCard({
  fileName,
  fileSize,
  technique,
  capacityBytes,
  messageBytesUsed,
}: Props) {
  const pct = capacityBytes > 0
    ? Math.min(100, (messageBytesUsed / capacityBytes) * 100)
    : 0;
  const overCapacity = messageBytesUsed > capacityBytes;

  return (
    <div className="border border-stgBorder rounded bg-white px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-black truncate max-w-[60%]">{fileName}</span>
        <span className="mono text-xs text-stgTextMuted">{formatBytes(fileSize)}</span>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-stgTextSecondary">
        <span>Technique: <span className="mono text-black">{technique}</span></span>
        <span className={overCapacity ? 'text-stgDanger font-semibold' : 'text-stgTextMuted'}>
          {formatBytes(messageBytesUsed)} / {formatBytes(capacityBytes)}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-stgBg overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            overCapacity ? 'bg-stgDanger' : 'bg-stgOrange'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}