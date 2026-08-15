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
    <header className="bg-stgBlack h-14 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-baseline gap-0.5">
        <span className="text-stgTextOnDark font-bold tracking-tight text-xl">STEGAN</span>
        <span className="text-stgOrange font-bold tracking-tight text-xl">ALIZ</span>
      </div>
      <nav className="flex items-center h-full gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`h-full px-5 text-xs font-semibold tracking-widest border-b-2 transition-colors ${
              active === tab.id
                ? 'text-stgTextOnDark border-stgOrange'
                : 'text-stgTextOnDarkMuted border-transparent hover:text-stgTextOnDark hover:border-stgTextOnDarkMuted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}