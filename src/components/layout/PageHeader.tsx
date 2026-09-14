import type { ModuleId } from './AppShell';

interface Props {
  title:        string;
  subtitle:     string;
  activeModule: ModuleId;
  onMenuClick:  () => void;
}

export default function PageHeader({ title, subtitle, onMenuClick }: Props) {
  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid var(--clr-border)',
        padding: 'var(--sp-4) var(--sp-5)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          aria-label="Open module menu"
          className="mobile-menu-btn"
          style={{
            display: 'none',
            background: 'none',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 8px',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--clr-text-primary)',
            lineHeight: 1.2,
            marginBottom: 4,
          }}>
            {title}
          </h1>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--clr-text-secondary)',
            lineHeight: 1.5,
            maxWidth: 560,
          }}>
            {subtitle}
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}