import { useState } from 'react';
import TermsModal from './TermsModal';

export default function Footer() {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      {showTerms && <TermsModal mode="review" onClose={() => setShowTerms(false)} />}
      <footer className="bg-stgBlack px-4 md:px-8 py-3 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Steganaliz v1.0</span>
            <span className="text-white/40 hidden sm:inline">
              - browser-based steganography &amp; steganalysis workbench
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <span className="mono text-white/40 hidden md:inline">34 supported formats</span>
            <span className="mono text-stgOrange">#AES-256-GCM</span>
            <button
              onClick={() => setShowTerms(true)}
              className="border border-white/20 text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
            >
              Terms &amp; Privacy
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}