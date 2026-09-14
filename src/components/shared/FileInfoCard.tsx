import { formatBytes } from '../../utils/formatBytes';

interface Props {
  file: File;
}

export default function FileInfoCard({ file }: Props) {
  const ext = file.name.split('.').pop()?.toUpperCase() ?? '—';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        background: '#fff',
        border: '1px solid var(--clr-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-3) var(--sp-4)',
      }}
    >
      {/* Extension badge */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--clr-orange-soft)',
        border: '1px solid var(--clr-orange)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--clr-orange)',
        letterSpacing: 0.5,
      }}>
        {ext}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--clr-text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {file.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {formatBytes(file.size)} · {file.type || 'unknown type'}
        </p>
      </div>
    </div>
  );
}