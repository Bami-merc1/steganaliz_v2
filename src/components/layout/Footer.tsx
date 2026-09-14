import { useState } from 'react';
import TermsModal from './TermsModal';
import { useAuthStore } from '../../store/useAuthStore';

export default function Footer() {
  const [showTerms, setShowTerms] = useState(false);
  const { isWorkspaceMode, email } = useAuthStore();

  return (
    <>
      {showTerms && <TermsModal mode="review" onClose={() => setShowTerms(false)} />}

      <footer
        style={{
          background: 'var(--clr-black)',
          padding: '0 var(--sp-5)',
          height: 'var(--footer-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 'var(--sp-4)',
        }}
      >
        {/* Left — branding + stat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', minWidth: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: 0.3, flexShrink: 0 }}>
            Steganaliz v2.0
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            className="footer-stat"
          >
            9 engines · 12 detectors
          </span>
        </div>

        {/* Right — mode + encryption badge + terms */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexShrink: 0 }}>
          {isWorkspaceMode ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: 'var(--clr-success)',
                fontFamily: 'var(--font-mono)',
              }}
              className="footer-mode"
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clr-success)' }} />
              {email?.split('@')[0]}
            </span>
          ) : (
            <span
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}
              className="footer-mode"
            >
              Private
            </span>
          )}

          <span
            style={{
              fontSize: 11,
              color: 'var(--clr-orange)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}
          >
            AES-256-GCM
          </span>

          <button
            onClick={() => setShowTerms(true)}
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color .15s, border-color .15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget).style.color = '#fff';
              (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget).style.color = 'rgba(255,255,255,0.4)';
              (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.12)';
            }}
          >
            Terms
          </button>
        </div>
      </footer>

      <style>{`
        @media (max-width: 480px) {
          .footer-stat  { display: none !important; }
          .footer-mode  { display: none !important; }
        }
      `}</style>
    </>
  );
}