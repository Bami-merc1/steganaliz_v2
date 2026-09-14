import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export type TopLevelView = 'workbench' | 'forensics' | 'training' | 'docs' | 'workspace';

interface Props {
  active:   TopLevelView;
  onSelect: (view: TopLevelView) => void;
  onLogout?: () => void;
}

const TABS: { id: TopLevelView; label: string }[] = [
  { id: 'workbench', label: 'Workbench' },
  { id: 'forensics', label: 'Forensics' },
  { id: 'training',  label: 'Training'  },
  { id: 'docs',      label: 'Docs'      },
  { id: 'workspace', label: 'Workspace' },
];

export default function Navbar({ active, onSelect, onLogout }: Props) {
  const [open, setOpen]   = useState(false);
  const { email, isWorkspaceMode } = useAuthStore();

  // Close menu on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSelect = (view: TopLevelView) => {
    onSelect(view);
    setOpen(false);
  };

  return (
    <>
      <header
        style={{
          background: 'var(--clr-black)',
          height: 'var(--navbar-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--sp-5)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <button
          onClick={() => handleSelect('workbench')}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>
            STEGAN
          </span>
          <span style={{ color: 'var(--clr-orange)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>
            ALIZ
          </span>
        </button>

        {/* Desktop nav */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 2,
            height: '100%',
          }}
          className="desktop-nav"
        >
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            const isWS     = tab.id === 'workspace' && isWorkspaceMode;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                style={{
                  height: 'var(--navbar-h)',
                  padding: '0 var(--sp-4)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--clr-orange)' : 'transparent'}`,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'color .15s, border-color .15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                }}
              >
                {isWS && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clr-success)', flexShrink: 0 }} />
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop right — email + logout */}
        <div className="desktop-nav" style={{ display: 'none', alignItems: 'center', gap: 10 }}>
          {isWorkspaceMode && email && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </span>
          )}
          {isWorkspaceMode && onLogout && (
            <button
              onClick={onLogout}
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                cursor: 'pointer',
                transition: 'color .15s, border-color .15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
              }}
            >
              Sign out
            </button>
          )}
        </div>

        {/* Mobile right — workspace dot + burger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="mobile-controls">
          {isWorkspaceMode && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--clr-success)' }} />
          )}
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              width: 28,
              alignItems: 'flex-end',
            }}
          >
            <span style={{
              display: 'block',
              height: 2,
              background: '#fff',
              borderRadius: 2,
              width: open ? '100%' : '100%',
              transform: open ? 'translateY(7px) rotate(45deg)' : 'none',
              transition: 'transform .2s',
            }} />
            <span style={{
              display: 'block',
              height: 2,
              background: '#fff',
              borderRadius: 2,
              width: '75%',
              opacity: open ? 0 : 1,
              transition: 'opacity .2s',
            }} />
            <span style={{
              display: 'block',
              height: 2,
              background: '#fff',
              borderRadius: 2,
              width: '100%',
              transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none',
              transition: 'transform .2s',
            }} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          pointerEvents: open ? 'all' : 'none',
        }}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            opacity: open ? 1 : 0,
            transition: 'opacity .2s',
          }}
        />
        {/* Drawer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 260,
            background: 'var(--clr-black)',
            transform: open ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 'var(--navbar-h)',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', padding: 'var(--sp-4) 0' }}>
            {TABS.map((tab) => {
              const isActive = active === tab.id;
              const isWS     = tab.id === 'workspace' && isWorkspaceMode;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelect(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 24px',
                    background: isActive ? 'rgba(232,84,42,0.12)' : 'none',
                    border: 'none',
                    borderLeft: `3px solid ${isActive ? 'var(--clr-orange)' : 'transparent'}`,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    fontSize: 15,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  {isWS && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--clr-success)', flexShrink: 0 }} />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile account footer */}
          {isWorkspaceMode && (
            <div
              style={{
                marginTop: 'auto',
                padding: 'var(--sp-5)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10, wordBreak: 'break-all' }}>
                {email}
              </p>
              {onLogout && (
                <button
                  onClick={() => { onLogout(); setOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Responsive style */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-controls { display: none !important; }
        }
      `}</style>
    </>
  );
}