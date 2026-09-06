import { useState } from 'react';
import EntropyHeatmap from './EntropyHeatmap';
import BitplaneInspector from './BitplaneInspector';
import ForensicReport from './ForensicReport';
import WaveformViewer from './WaveformViewer';
import FileDiffViewer from './FileDiffViewer';
import CapacityCalculator from './CapacityCalculator';
import AlgorithmComparison from './AlgorithmComparison';

type ForensicsTool = 'heatmap' | 'bitplane' | 'waveform' | 'diff' | 'capacity' | 'compare' | 'report';

const TOOLS: { id: ForensicsTool; label: string; description: string }[] = [
  {
    id: 'heatmap',
    label: 'Entropy Heatmap',
    description: 'Visualise per-block Shannon entropy as a colour heatmap — high-entropy regions appear as warm spots against the natural image baseline.',
  },
  {
    id: 'bitplane',
    label: 'Bitplane Inspector',
    description: 'Isolate and view any single bit-position of any colour channel. Sequential LSB payloads produce a sharp rectangular boundary in the LSB plane.',
  },
  {
    id: 'waveform',
    label: 'Waveform Viewer',
    description: 'Render the amplitude waveform of a WAV or MP3 file — useful for a quick visual sanity check alongside statistical steganalysis.',
  },
  {
    id: 'diff',
    label: 'File Diff Viewer',
    description: 'Binary diff of two files — compare a clean carrier against its stego counterpart to see exactly which bytes changed and where.',
  },
  {
    id: 'capacity',
    label: 'Capacity Calculator',
    description: 'Interactive calculator showing how many bytes each technique can hide in a given carrier, with a full reference table across all formats.',
  },
  {
    id: 'compare',
    label: 'Algorithm Comparison',
    description: 'Benchmark every available technique on the same carrier — compare capacity, embed speed, size overhead, and steganalysis detectability side-by-side.',
  },
  {
    id: 'report',
    label: 'Forensic Report',
    description: 'Run the full 12-detector steganalysis suite and export a structured forensic report (PDF, .txt, or JSON) with methodology notes and a formal disclaimer.',
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
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed md:relative z-30 md:z-auto top-0 md:top-auto left-0 h-full md:h-auto transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <aside className="w-52 bg-stgBg border-r border-stgBorder flex flex-col h-full">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <span className="text-xs font-semibold tracking-widest text-stgTextMuted uppercase">Tools</span>
            <button className="md:hidden text-stgTextMuted hover:text-black" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>
          <nav className="flex flex-col">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleSelect(tool.id)}
                className={`text-left px-5 py-3 text-sm border-l-2 transition-colors ${
                  activeTool === tool.id
                    ? 'border-stgOrange bg-stgOrangeSoft text-black font-semibold'
                    : 'border-transparent text-stgTextSecondary hover:bg-white hover:text-black'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </nav>
        </aside>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="bg-white border-b border-stgBorder px-4 md:px-8 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 mr-1" aria-label="Open tools menu">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-black">{active.label}</h2>
          </div>
          <p className="text-sm text-stgTextSecondary max-w-2xl leading-relaxed">{active.description}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-stgBg">
          {activeTool === 'heatmap'  && <EntropyHeatmap />}
          {activeTool === 'bitplane' && <BitplaneInspector />}
          {activeTool === 'waveform' && <WaveformViewer />}
          {activeTool === 'diff'     && <FileDiffViewer />}
          {activeTool === 'capacity' && <CapacityCalculator />}
          {activeTool === 'compare'  && <AlgorithmComparison />}
          {activeTool === 'report'   && <ForensicReport />}
        </div>
      </div>
    </div>
  );
}