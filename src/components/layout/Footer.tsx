import { useState } from 'react';
import TermsModal from './TermsModal';
import { useAuthStore } from '../../store/useAuthStore';

export default function Footer() {
  const [showTerms, setShowTerms]   = useState(false);
  const { isWorkspaceMode, email }  = useAuthStore();

  return (
    <>
      {showTerms && <TermsModal mode="review" onClose={() => setShowTerms(false)} />}
      <footer className="bg-stgBlack px-4 md:px-8 py-3 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Steganaliz v2.0</span>
            <span className="text-white/40 hidden sm:inline">
              — 9 embedding engines · 12 steganalysis detectors
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            {isWorkspaceMode ? (
              <span className="mono text-stgSuccess text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-stgSuccess" />
                Workspace · {email}
              </span>
            ) : (
              <span className="mono text-white/40 hidden md:inline">Private Mode</span>
            )}
            <span className="mono text-stgOrange">#AES-256-GCM</span>
            <button
              onClick={() => setShowTerms(true)}
              className="border border-white/20 text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
            >
              Terms & Privacy
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}