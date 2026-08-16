import { useState } from 'react';
import TermsModal from './TermsModal';

export default function Footer() {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      <footer className="bg-stgBlack px-8 py-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">Steganaliz v1.0</span>
          <span className="text-stgTextOnDarkMuted">
            — browser-based steganography &amp; steganalysis workbench
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="mono text-stgTextOnDarkMuted">34 supported formats</span>
          <span className="text-stgTextOnDarkMuted">·</span>
          <span className="mono text-stgTextOnDarkMuted">All processing local</span>
          <span className="text-stgTextOnDarkMuted">·</span>
          <span className="mono text-stgOrange">#AES-256-GCM encrypted</span>
          <button
            onClick={() => setShowTerms(true)}
            className="ml-2 border border-white/20 text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
          >
            Review Terms &amp; Privacy
          </button>
        </div>
      </footer>
    </>
  );
}