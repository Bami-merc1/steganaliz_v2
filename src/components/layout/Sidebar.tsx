import type { ModuleId } from './AppShell';

const MODULES: { id: ModuleId; label: string; icon: string }[] = [
  { id: 'embed',    label: 'Embed',      icon: '↓' },
  { id: 'extract',  label: 'Extract',    icon: '↑' },
  { id: 'detect',   label: 'Detect',     icon: '◎' },
  { id: 'batch',    label: 'Batch',      icon: '⊞' },
  { id: 'metadata', label: 'Metadata',   icon: '◈' },
  { id: 'history',  label: 'History',    icon: '⊙' },
  { id: 'ctf',      label: 'CTF Solver', icon: '⚑' },
];

interface Props {
  active:   ModuleId;
  onSelect: (id: ModuleId) => void;
}

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <aside
      style={{
        width: 'var(--sidebar-w)',
        background: '#fff',
        borderRight: '1px solid var(--clr-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '12px 0 8px' }}>
        <p style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 1,
          color: 'var(--clr-text-muted)',
          padding: '0 16px 8px',
          textTransform: 'uppercase',
        }}>
          Tools
        </p>
        {MODULES.map((mod) => {
          const isActive = mod.id === active;
          return (
            <button
              key={mod.id}
              onClick={() => onSelect(mod.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                background: isActive ? 'var(--clr-orange-soft)' : 'none',
                border: 'none',
                borderLeft: `2px solid ${isActive ? 'var(--clr-orange)' : 'transparent'}`,
                color: isActive ? 'var(--clr-text-primary)' : 'var(--clr-text-secondary)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background .12s, color .12s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget).style.background = 'var(--clr-bg)';
                  (e.currentTarget).style.color = 'var(--clr-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget).style.background = 'none';
                  (e.currentTarget).style.color = 'var(--clr-text-secondary)';
                }
              }}
            >
              <span style={{
                fontSize: 14,
                opacity: isActive ? 1 : 0.5,
                width: 18,
                textAlign: 'center',
                flexShrink: 0,
              }}>
                {mod.icon}
              </span>
              {mod.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}