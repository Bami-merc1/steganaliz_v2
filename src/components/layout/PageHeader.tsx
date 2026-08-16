import type { ModuleId } from './AppShell';

interface Props {
  title: string;
  subtitle: string;
  activeModule: ModuleId;
  onMenuClick?: () => void;
}

export default function PageHeader({ title, subtitle, onMenuClick }: Props) {
  return (
    <>
      <div className="flex items-center justify-between px-4 md:px-8 py-3 border-b border-stgBorder bg-white text-sm shrink-0">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger for sidebar */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-1 mr-1"
            aria-label="Open module menu"
          >
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-stgTextMuted hidden sm:inline">Workbench /</span>
          <span className="text-black font-semibold">{title}</span>
        </div>
        <span className="mono text-xs text-stgTextMuted hidden lg:block">
          Client-side only · no data leaves this device
        </span>
      </div>

      <div className="px-4 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 border-b border-stgBorder bg-white shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-black">{title}</h1>
        <p className="text-sm text-stgTextSecondary mt-1.5 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
    </>
  );
}