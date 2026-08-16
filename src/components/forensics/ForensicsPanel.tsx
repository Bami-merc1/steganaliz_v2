import { useState } from 'react';
import EntropyHeatmap from './EntropyHeatmap';
import BitplaneInspector from './BitplaneInspector';
import ForensicReport from './ForensicReport';

type ForensicsTool = 'heatmap' | 'bitplane' | 'report';

const TOOLS: { id: ForensicsTool; label: string; icon: string; description: string }[] = [
  {
    id: 'heatmap',
    label: 'Entropy Heatmap',
    icon: '◫',
    description:
      'Visualise per-block Shannon entropy as a colour heatmap — anomalous high-entropy regions appear as hot spots against the natural baseline.',
  },
  {
    id: 'bitplane',
    label: 'Bitplane Inspector',
    icon: '⊟',
    description:
      'Isolate and view any single bit-position of any colour channel. Sequential LSB payloads produce a sharp rectangular boundary in the LSB plane.',
  },
  {
    id: 'report',
    label: 'Forensic Report',
    icon: '⎙',
    description:
      'Run the full 10-detector steganalysis suite and export a structured forensic report (PDF or .txt) with methodology notes and a formal disclaimer.',
  },
];

export default function ForensicsPanel() {
  const [activeTool, setActiveTool] = useState<ForensicsTool>('heatmap');
  const active = TOOLS.find((t) => t.id === activeTool)!;

  return (
    <div className="flex flex-1 min-h-0">
      {/* Dark sidebar — same as Workbench and Training */}
      <aside className="w-52 bg-stgBg border-r border-stgBorder flex flex-col shrink-0">
        <div className="px-4 pt-5 pb-2">
          <span className="text-[10px] font-bold tracking-[0.15em] text-stgSidebarText/60 uppercase">
            Tools
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-full text-left px-5 py-3 text-sm border-l-2 transition-colors ${
                  isActive
                    ? 'border-stgOrange bg-stgOrangeSoft text-black font-semibold'
                    : 'border-transparent text-stgTextSecondary hover:bg-white hover:text-black'
                }`}
              >
                <span className="text-xs font-semibold tracking-widest text-stgTextMuted uppercase">
                  Tools
                </span>
                {tool.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content pane */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tool header — matches Workbench PageHeader style */}
        <div className="bg-stgSurface border-b border-stgBorder px-8 pt-6 pb-5 shrink-0">
          <h2 className="text-xl font-semibold text-stgTextPrimary tracking-tight">
            {active.label}
          </h2>
          <p className="text-sm text-stgTextSecondary mt-1.5 max-w-2xl leading-relaxed">
            {active.description}
          </p>
        </div>

        {/* Tool content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-stgBg">
          {activeTool === 'heatmap'  && <EntropyHeatmap />}
          {activeTool === 'bitplane' && <BitplaneInspector />}
          {activeTool === 'report'   && <ForensicReport />}
        </div>
      </div>
    </div>
  );
}