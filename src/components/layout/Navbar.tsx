export type TopLevelView = 'workbench' | 'forensics' | 'training';

interface Props {
  active: TopLevelView;
  onSelect: (view: TopLevelView) => void;
}

const TABS: { id: TopLevelView; label: string }[] = [
  { id: 'workbench', label: 'WORKBENCH' },
  { id: 'forensics', label: 'FORENSICS' },
  { id: 'training', label: 'TRAINING' },
];

export default function Navbar({ active, onSelect }: Props) {
  return (
    <header className="bg-stgBlack border-b border-stgOrange/40">
      <div className="flex items-center justify-between px-8 h-14">
        <div className="flex items-baseline gap-1">
          <span className="text-stgTextOnDark font-semibold tracking-wide text-lg">STEGAN</span>
          <span className="text-stgOrange font-semibold tracking-wide text-lg">ALIZ</span>
        </div>
        <nav className="flex items-center gap-8 text-xs font-medium tracking-wide h-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={`h-full flex items-center border-b-2 ${
                active === tab.id
                  ? 'text-stgTextOnDark border-stgOrange'
                  : 'text-stgTextMuted border-transparent hover:text-stgTextOnDark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}