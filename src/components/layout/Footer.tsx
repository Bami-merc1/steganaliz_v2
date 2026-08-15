import { useState } from 'react';
import TermsModal from './TermsModal';

export default function Footer() {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      <footer className="bg-stgBlack border-t border-stgOrange/40 px-8 py-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 text-stgTextOnDark">
          <span className="font-semibold">Steganaliz v1.0</span>
          <span className="text-stgTextMuted">
            · browser-based steganography &amp; steganalysis workbench
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="mono text-stgTextMuted">34 supported formats</span>
          <span className="text-stgTextMuted">·</span>
          <span className="mono text-stgTextMuted">11 tabs</span>
          <span className="text-stgTextMuted">·</span>
          <span className="mono text-stgTextMuted">All processing local</span>
          <span className="text-stgTextMuted">·</span>
          <span className="mono text-stgOrange">#AES-256-GCM encrypted</span>
          <button
            onClick={() => setShowTerms(true)}
            className="ml-3 border border-stgBorderStrong text-stgTextOnDark px-3 py-1.5 rounded hover:bg-stgBlackSoft transition-colors"
          >
            Review Terms &amp; Privacy
          </button>
        </div>
      </footer>
    </>
  );
}