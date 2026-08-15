import type { ModuleId } from './AppShell';

interface Props {
  title: string;
  subtitle: string;
  activeModule: ModuleId;
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <>
      <div className="flex items-center justify-between px-8 py-3 border-b border-stgBorder text-xs">
        <span className="text-stgTextMuted">
          Workbench / <span className="text-stgTextPrimary font-medium">{title}</span>
        </span>
        <span className="mono text-stgTextMuted">
          Client-side only · no data leaves this device
        </span>
      </div>
      <div className="px-8 pt-6 pb-4 border-b border-stgBorder bg-stgSurface">
        <h1 className="text-2xl font-semibold text-stgTextPrimary">{title}</h1>
        <p className="text-sm text-stgTextSecondary mt-1 max-w-2xl">{subtitle}</p>
      </div>
    </>
  );
}