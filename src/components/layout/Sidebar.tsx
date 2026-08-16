import type { ModuleId } from './AppShell';

const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'embed',    label: 'Embed'    },
  { id: 'extract',  label: 'Extract'  },
  { id: 'detect',   label: 'Detect'   },
  { id: 'batch',    label: 'Batch'    },
  { id: 'metadata', label: 'Metadata' },
  { id: 'history',  label: 'History'  },
  { id: 'ctf',      label: 'CTF'      },
];

interface Props {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
}

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <aside className="w-56 bg-stgBg border-r border-stgBorder flex flex-col justify-between shrink-0">
      <div>
        <div className="px-5 pt-5 pb-2">
          <span className="text-xs font-semibold tracking-widest text-stgTextMuted uppercase">
            Modules
          </span>
        </div>
        <nav className="flex flex-col">
          {MODULES.map((m) => {
            const isActive = m.id === active;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`text-left px-5 py-3 text-sm border-l-2 transition-colors ${
                  isActive
                    ? 'border-stgOrange bg-stgOrangeSoft text-black font-semibold'
                    : 'border-transparent text-stgTextSecondary hover:bg-white hover:text-black'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mx-5 mb-5 pt-4 border-t border-stgBorder">
        <p className="mono text-xs leading-relaxed text-stgTextMuted">
          AES-256-GCM · PBKDF2-SHA256 · 310,000 iterations.
          All processing executes in this browser via the Web Crypto API.
        </p>
      </div>
    </aside>
  );
}