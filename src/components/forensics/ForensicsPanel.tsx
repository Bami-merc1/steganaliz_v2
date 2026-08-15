import { useState } from 'react';
import EntropyHeatmap from './EntropyHeatmap';
import BitplaneInspector from './BitplaneInspector';
import ForensicReport from './ForensicReport';

type ForensicsTool = 'heatmap' | 'bitplane' | 'report';

const TOOLS: { id: ForensicsTool; label: string; description: string }[] = [
  {
    id: 'heatmap',
    label: 'Entropy Heatmap',
    description: 'Visualise per-block Shannon entropy as a colour heatmap — anomalous regions stand out as hot spots.',
  },
  {
    id: 'bitplane',
    label: 'Bitplane Inspector',
    description: 'Isolate and view any single bit-position of any colour channel. Sequential LSB payloads produce a visible rectangular boundary in the LSB plane.',
  },
  {
    id: 'report',
    label: 'Forensic Report',
    description: 'Run the full 10-detector steganalysis suite and generate a downloadable forensic report with methodology notes and disclaimer.',
  },
];

export default function ForensicsPanel() {
  const [activeTool, setActiveTool] = useState<ForensicsTool>('heatmap');
  const active = TOOLS.find((t) => t.id === activeTool)!;

  return (
    <div className="flex h-full">
      <aside className="w-56 border-r border-stgBorder shrink-0 pt-4">
        <p className="px-5 pb-2 text-[11px] tracking-wider text-stgTextMuted font-medium">
          TOOLS
        </p>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`block w-full text-left px-5 py-2.5 text-sm border-l-2 transition-colors ${
              activeTool === tool.id
                ? 'border-stgOrange bg-stgOrangeSoft/40 text-stgTextPrimary font-medium'
                : 'border-transparent text-stgTextSecondary hover:bg-stgSurface hover:text-stgTextPrimary'
            }`}
          >
            {tool.label}
          </button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 pt-6 pb-4 border-b border-stgBorder bg-stgSurface shrink-0">
          <h2 className="text-lg font-semibold text-stgTextPrimary">{active.label}</h2>
          <p className="text-sm text-stgTextSecondary mt-0.5 max-w-2xl">{active.description}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTool === 'heatmap' && <EntropyHeatmap />}
          {activeTool === 'bitplane' && <BitplaneInspector />}
          {activeTool === 'report' && <ForensicReport />}
        </div>
      </div>
    </div>
  );
}