import { useState } from 'react';
import EntropyHeatmap from './EntropyHeatmap';
import BitplaneInspector from './BitplaneInspector';
import ForensicReport from './ForensicReport';

type ForensicsTool = 'heatmap' | 'bitplane' | 'report';

const TOOLS: { id: ForensicsTool; label: string; description: string }[] = [
  {
    id: 'heatmap',
    label: 'Entropy Heatmap',
    description:
      'Visualise per-block Shannon entropy as a colour heatmap - anomalous high-entropy regions appear as hot spots against the natural baseline.',
  },
  {
    id: 'bitplane',
    label: 'Bitplane Inspector',
    description:
      'Isolate and view any single bit-position of any colour channel. Sequential LSB payloads produce a sharp rectangular boundary in the LSB plane.',
  },
  {
    id: 'report',
    label: 'Forensic Report',
    description:
      'Run the full 10-detector steganalysis suite and export a structured forensic report (PDF or .txt) with methodology notes and a formal disclaimer.',
  },
];

export default function ForensicsPanel() {
  const [activeTool, setActiveTool] = useState<ForensicsTool>('heatmap');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = TOOLS.find((t) => t.id === activeTool)!;

  const handleSelect = (id: ForensicsTool) => {
    setActiveTool(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:relative z-30 md:z-auto top-0 md:top-auto left-0 h-full md:h-auto
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <aside className="w-52 bg-stgBg border-r border-stgBorder flex flex-col h-full">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <span className="text-xs font-semibold tracking-widest text-stgTextMuted uppercase">
              Tools
            </span>
            <button
              className="md:hidden text-stgTextMuted hover:text-black"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>
          <nav className="flex flex-col">
            {TOOLS.map((tool) => {
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleSelect(tool.id)}
                  className={`text-left px-5 py-3 text-sm border-l-2 transition-colors ${
                    isActive
                      ? 'border-stgOrange bg-stgOrangeSoft text-black font-semibold'
                      : 'border-transparent text-stgTextSecondary hover:bg-white hover:text-black'
                  }`}
                >
                  {tool.label}
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Tool header with mobile burger */}
        <div className="bg-white border-b border-stgBorder px-4 md:px-8 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 mr-1"
              aria-label="Open tools menu"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-black">{active.label}</h2>
          </div>
          <p className="text-sm text-stgTextSecondary max-w-2xl leading-relaxed">
            {active.description}
          </p>
        </div>

        {/* Tool content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-stgBg">
          {activeTool === 'heatmap'  && <EntropyHeatmap />}
          {activeTool === 'bitplane' && <BitplaneInspector />}
          {activeTool === 'report'   && <ForensicReport />}
        </div>
      </div>
    </div>
  );
}