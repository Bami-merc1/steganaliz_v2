import type { ModuleId } from './AppShell';

interface Props {
  title: string;
  subtitle: string;
  activeModule: ModuleId;
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <>
      <div className="flex items-center justify-between px-8 py-3 border-b border-stgBorder bg-white text-sm">
        <span className="text-stgTextMuted">
          Workbench /{'  '}
          <span className="text-black font-semibold">{title}</span>
        </span>
        <span className="mono text-xs text-stgTextMuted">
          Client-side only · no data leaves this device
        </span>
      </div>

      <div className="px-8 pt-7 pb-5 border-b border-stgBorder bg-white">
        <h1 className="text-2xl font-bold text-black">{title}</h1>
        <p className="text-sm text-stgTextSecondary mt-2 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
    </>
  );
}