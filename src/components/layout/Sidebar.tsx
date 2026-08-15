import type { ModuleId } from './AppShell';

const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'embed', label: 'Embed' },
  { id: 'extract', label: 'Extract' },
  { id: 'detect', label: 'Detect' },
  { id: 'batch', label: 'Batch' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'history', label: 'History' },
  { id: 'ctf', label: 'CTF' },
];

interface Props {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
}

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <aside className="w-56 border-r border-stgBorder bg-stgBg flex flex-col justify-between">
      <div>
        <div className="px-5 pt-5 pb-2 text-[11px] tracking-wider text-stgTextMuted font-medium">
          MODULES
        </div>
        <nav className="flex flex-col">
          {MODULES.map((m) => {
            const isActive = m.id === active;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`text-left px-5 py-2.5 text-sm border-l-2 transition-colors ${
                  isActive
                    ? 'border-stgOrange bg-stgOrangeSoft/40 text-stgTextPrimary font-medium'
                    : 'border-transparent text-stgTextSecondary hover:bg-stgSurface hover:text-stgTextPrimary'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mx-5 mb-5 pt-4 border-t border-stgBorder">
        <p className="mono text-[11px] leading-relaxed text-stgTextMuted">
          AES-256-GCM · PBKDF2-SHA256 · 310,000 iterations. All processing
          executes in this browser via the Web Crypto API.
        </p>
      </div>
    </aside>
  );
}