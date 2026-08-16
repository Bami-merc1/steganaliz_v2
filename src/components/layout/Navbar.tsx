import { useState } from 'react';

export type TopLevelView = 'workbench' | 'forensics' | 'training';

interface Props {
  active: TopLevelView;
  onSelect: (view: TopLevelView) => void;
}

const TABS: { id: TopLevelView; label: string }[] = [
  { id: 'workbench', label: 'WORKBENCH' },
  { id: 'forensics', label: 'FORENSICS' },
  { id: 'training',  label: 'TRAINING'  },
];

export default function Navbar({ active, onSelect }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelect = (view: TopLevelView) => {
    onSelect(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-stgBlack shrink-0 relative z-40">
      <div className="flex items-center justify-between px-4 md:px-8 h-14">
        {/* Logo */}
        <div className="flex items-baseline">
          <span className="text-white font-bold tracking-tight text-xl">STEGAN</span>
          <span className="text-stgOrange font-bold tracking-tight text-xl">ALIZ</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center h-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`h-14 px-6 text-xs font-semibold tracking-widest border-b-2 transition-colors ${
                active === tab.id
                  ? 'text-white border-stgOrange'
                  : 'text-white/50 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Mobile burger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-stgBlack border-t border-white/10 z-50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`w-full text-left px-6 py-4 text-sm font-semibold tracking-widest border-l-4 transition-colors ${
                active === tab.id
                  ? 'text-white border-stgOrange bg-white/5'
                  : 'text-white/60 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}