import type { ModuleId } from './AppShell';

interface Props {
  title: string;
  subtitle: string;
  activeModule: ModuleId;
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <>
      {/* Breadcrumb strip */}
      <div className="bg-stgSurface border-b border-stgBorder px-8 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-stgTextMuted">
          <span>Workbench</span>
          <span className="text-stgBorderStrong">/</span>
          <span className="text-stgTextPrimary font-medium">{title}</span>
        </div>
        <span className="mono text-[11px] text-stgTextMuted">
          Client-side only · no data leaves this device
        </span>
      </div>

      {/* Page header */}
      <div className="bg-stgSurface border-b border-stgBorder px-8 pt-6 pb-5">
        <h1 className="text-2xl font-semibold text-stgTextPrimary tracking-tight">{title}</h1>
        <p className="text-sm text-stgTextSecondary mt-1.5 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
    </>
  );
}