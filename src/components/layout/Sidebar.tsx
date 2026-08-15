import type { ModuleId } from './AppShell';

const MODULES: { id: ModuleId; label: string}[] = [
  { id: 'embed',    label: 'Embed'},
  { id: 'extract',  label: 'Extract'},
  { id: 'detect',   label: 'Detect'},
  { id: 'batch',    label: 'Batch'},
  { id: 'metadata', label: 'Metadata'},
  { id: 'history',  label: 'History'},
  { id: 'ctf',      label: 'CTF Mode'},
];

interface Props {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
}

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <aside className="w-52 bg-stgSidebar flex flex-col justify-between shrink-0">
      <div>
        <div className="px-4 pt-5 pb-2">
          <span className="text-[10px] font-bold tracking-[0.15em] text-stgSidebarText/60 uppercase">
            Modules
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {MODULES.map((m) => {
            const isActive = m.id === active;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-colors border-l-2 ${
                  isActive
                    ? 'bg-stgSidebarActive border-stgOrange text-stgSidebarTextActive font-medium'
                    : 'border-transparent text-stgSidebarText hover:bg-stgSidebarHover hover:text-stgSidebarTextActive'
                }`}
              >
                <span className="text-xs opacity-70 w-4 text-center">{}</span>
                {m.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mx-3 mb-5 pt-4 border-t border-stgSidebarBorder">
        <p className="mono text-[10px] leading-relaxed text-stgSidebarText/50">
          AES-256-GCM · PBKDF2-SHA256<br />
          310,000 iterations<br />
          All processing in this browser.
        </p>
      </div>
    </aside>
  );
}