interface Props {
  onClose: () => void;
}

export default function TermsModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stgBlack/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-stgSurface border border-stgBorder rounded max-w-xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stgBorder">
          <h2 className="text-base font-semibold text-stgTextPrimary">
            Terms of Use & Privacy
          </h2>
          <button
            onClick={onClose}
            className="text-stgTextMuted hover:text-stgTextPrimary text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-stgTextSecondary">
          <section>
            <h3 className="text-stgTextPrimary font-medium mb-1.5">Privacy — no data leaves this device</h3>
            <p className="leading-relaxed">
              Steganaliz processes all files, messages, and passwords entirely within your
              browser tab using the Web Crypto API and Canvas API. No file content, payload
              data, passwords, or analysis results are transmitted to any server, logged,
              or stored outside your current browser session. When you close this tab,
              session history is permanently discarded.
            </p>
          </section>

          <section>
            <h3 className="text-stgTextPrimary font-medium mb-1.5">Intended use</h3>
            <p className="leading-relaxed">
              This tool is provided for legitimate educational, research, and professional
              purposes including: digital forensics, academic study of information hiding
              techniques, security research, and CTF (Capture the Flag) competitions.
            </p>
          </section>

          <section>
            <h3 className="text-stgTextPrimary font-medium mb-1.5">Acceptable use</h3>
            <p className="leading-relaxed">
              You agree not to use this tool to conceal information for the purpose of
              evading lawful oversight, to hide content that is illegal in your jurisdiction,
              or in any way that violates applicable law. The authors accept no liability for
              misuse of steganographic techniques enabled by this software.
            </p>
          </section>

          <section>
            <h3 className="text-stgTextPrimary font-medium mb-1.5">Forensic disclaimer</h3>
            <p className="leading-relaxed">
              Steganalysis results produced by this tool are based on statistical
              heuristics and should not be treated as conclusive forensic evidence
              without independent expert verification. Known false-positive rates exist,
              particularly on compressed, encrypted, or naturally high-entropy content.
            </p>
          </section>

          <section>
            <h3 className="text-stgTextPrimary font-medium mb-1.5">No warranty</h3>
            <p className="leading-relaxed">
              This software is provided "as is", without warranty of any kind. In no event
              shall the authors be liable for any claim, damages, or other liability arising
              from its use.
            </p>
          </section>

          <section>
            <h3 className="text-stgTextPrimary font-medium mb-1.5">Open source</h3>
            <p className="leading-relaxed">
              Steganaliz is released under the MIT licence. Source code is available for
              review, modification, and redistribution subject to licence terms.
            </p>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-stgBorder">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium rounded bg-stgOrange text-white hover:bg-stgOrange/90"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}