import { useState } from 'react';

interface Props {
  mode: 'gate' | 'review';
  onAccept?: () => void;
  onClose?: () => void;
}

export default function TermsModal({ mode, onAccept, onClose }: Props) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom) setScrolledToBottom(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="relative bg-white border border-gray-200 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-black">
              {mode === 'gate' ? 'Terms of Use & Privacy Policy' : 'Review Terms & Privacy'}
            </h2>
            {mode === 'gate' && (
              <p className="text-xs text-gray-500 mt-0.5">
                You must read and accept these terms before using Steganaliz.
              </p>
            )}
          </div>
          {mode === 'review' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-black text-xl leading-none p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div
          className="overflow-y-auto px-6 py-5 flex-1"
          onScroll={handleScroll}
        >
          <div className="space-y-5 text-sm text-gray-700 leading-relaxed">

            <div className="bg-orange-50 border border-orange-200 rounded p-3 text-xs text-orange-800">
              <strong>Important:</strong> Steganaliz is a dual-use security research tool.
              Misuse for illegal purposes is strictly prohibited and may constitute a criminal
              offence under applicable law. By using this tool, you confirm that you are at
              least 18 years of age and that your intended use is lawful.
            </div>

            <section>
              <h3 className="font-bold text-black text-base mb-2">1. Privacy - No Data Leaves This Device</h3>
              <p>
                Steganaliz processes all files, messages, passwords, and analysis results
                entirely within your browser tab using the Web Crypto API and HTML5 Canvas API.
                <strong> No file content, payload data, passwords, cryptographic keys, or
                analysis results are transmitted to any server, logged, stored, or shared
                with any third party at any time.</strong> When you close this tab, all
                session data is permanently and irrecoverably discarded.
              </p>
              <p className="mt-2">
                This architecture complies with the principle of data minimisation under
                <strong> Article 5(1)(c) of the General Data Protection Regulation (GDPR)</strong>,
                the <strong>UK Data Protection Act 2018</strong>, the
                <strong> Nigeria Data Protection Act 2023 (NDPA)</strong>, and the
                <strong> California Consumer Privacy Act (CCPA)</strong>, as no personal
                data is collected, processed, or retained by the application or its operators.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">2. Cookies and Tracking</h3>
              <p>
                Steganaliz does not use cookies, tracking pixels, analytics scripts,
                fingerprinting techniques, or any form of user tracking. The only data
                stored locally is your acceptance of these terms (in <code>localStorage</code>),
                which contains no personal information and can be cleared at any time by
                clearing your browser's site data.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">3. Lawful and Authorised Use Only</h3>
              <p>
                This tool is provided exclusively for the following lawful purposes:
              </p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Academic research and study in the fields of cybersecurity, digital forensics, and information security</li>
                <li>Authorised digital forensic investigation by qualified professionals acting within their lawful mandate</li>
                <li>Security research, vulnerability assessment, and penetration testing conducted with explicit written authorisation from the relevant asset owner</li>
                {/* <li>Capture The Flag (CTF) competitions and educational exercises</li> */}
                <li>Personal, private, and lawful communication privacy</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">4. Prohibited Uses - Criminal and Civil Liability</h3>
              <p>
                The following uses are <strong>strictly prohibited</strong> and may constitute
                criminal offences under applicable legislation including but not limited to:
                the <strong>Computer Misuse Act 1990 (UK)</strong>, the
                <strong> Cybercrime (Prohibition, Prevention, etc.) Act 2015 (Nigeria)</strong>,
                the <strong>Computer Fraud and Abuse Act (USA)</strong>, and equivalent
                legislation in other jurisdictions:
              </p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Concealing evidence of criminal activity or evading lawful law enforcement oversight</li>
                <li>Embedding, transmitting, or storing content that is illegal in your jurisdiction, including but not limited to child sexual abuse material (CSAM), content inciting violence or terrorism, or defamatory material</li>
                <li>Unauthorised interception, exfiltration, or concealment of data belonging to another person or organisation</li>
                <li>Circumventing Digital Rights Management (DRM) systems in violation of applicable copyright law</li>
                <li>Any use in connection with fraud, extortion, harassment, or other criminal conduct</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">5. Forensic Disclaimer</h3>
              <p>
                Steganalysis results produced by this tool are based on statistical heuristics
                and computational analysis. <strong>They must not be treated as conclusive
                forensic evidence</strong> in any legal, administrative, or disciplinary
                proceeding without independent verification by a qualified forensic expert.
                The authors accept no liability for decisions made on the basis of this
                tool's output.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">6. Encryption Notice</h3>
              <p>
                Steganaliz implements AES-256-GCM encryption with PBKDF2-SHA256 key derivation
                (310,000 iterations). Users in jurisdictions with restrictions on the use,
                import, or export of strong cryptography are solely responsible for ensuring
                their use complies with applicable export control regulations, including but
                not limited to the <strong>Wassenaar Arrangement</strong>, US
                <strong> Export Administration Regulations (EAR)</strong>, and equivalent
                national controls.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">7. Intellectual Property</h3>
              <p>
                Steganaliz is released under the <strong>MIT Licence</strong>. You are free
                to use, copy, modify, and distribute the source code subject to the terms
                of that licence. The MIT Licence does not grant any rights to use the
                Steganaliz name or branding for derivative works without permission.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">8. No Warranty and Limitation of Liability</h3>
              <p>
                This software is provided <strong>"as is"</strong>, without warranty of
                any kind, express or implied, including but not limited to warranties of
                merchantability, fitness for a particular purpose, or non-infringement.
                In no event shall the authors, contributors, or affiliated institutions be
                liable for any direct, indirect, incidental, special, exemplary, or
                consequential damages arising from the use of or inability to use this
                software, even if advised of the possibility of such damages.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">9. Governing Law</h3>
              <p>
                These terms are governed by the laws of the Federal Republic of Nigeria,
                without regard to conflict of law principles. Any disputes shall be subject
                to the exclusive jurisdiction of the courts of Nigeria.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-black text-base mb-2">10. Changes to These Terms</h3>
              <p>
                These terms may be updated from time to time. Continued use of the application
                after any update constitutes acceptance of the revised terms. The effective
                date of the current version is <strong>August 2026</strong>.
              </p>
            </section>

            <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              {/* Steganaliz v1.0 · SQI College of ICT, Ogbomoso, Nigeria · August 2026 ·
              Effective date: August 2026 */}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 shrink-0 bg-gray-50">
          {mode === 'gate' ? (
            <div className="space-y-3">
              {!scrolledToBottom && (
                <p className="text-xs text-gray-500 text-center">
                  Please scroll to the bottom to read the full terms before accepting.
                </p>
              )}
              <label className={`flex items-start gap-2.5 cursor-pointer ${!scrolledToBottom ? 'opacity-40 pointer-events-none' : ''}`}>
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-700">
                  I have read and understood the Terms of Use and Privacy Policy, and I
                  confirm that I am at least 18 years old and will use this tool only for
                  lawful purposes.
                </span>
              </label>
              <button
                onClick={() => accepted && onAccept?.()}
                disabled={!accepted || !scrolledToBottom}
                className={`w-full py-2.5 rounded text-sm font-bold transition-colors ${
                  accepted && scrolledToBottom
                    ? 'bg-stgOrange text-white hover:bg-stgOrange/90'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                I Accept - Enter Steganaliz
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded text-sm font-bold bg-stgOrange text-white hover:bg-stgOrange/90"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}