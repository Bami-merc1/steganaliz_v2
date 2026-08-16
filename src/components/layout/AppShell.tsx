import { useState } from 'react';
import Navbar, { type TopLevelView } from './Navbar';
import Sidebar from './Sidebar';
import PageHeader from './PageHeader';
import Footer from './Footer';
import EmbedPanel from '../embed/EmbedPanel';
import ExtractPanel from '../extract/ExtractPanel';
import DetectPanel from '../detect/DetectPanel';
import BatchPanel from '../batch/BatchPanel';
import MetadataPanel from '../metadata/MetadataPanel';
import HistoryPanel from '../history/HistoryPanel';
import CTFPanel from '../ctf/CTFPanel';
import TrainingPanel from '../training/TrainingPanel';
import ForensicsPanel from '../forensics/ForensicsPanel';

export type ModuleId =
  | 'embed'
  | 'extract'
  | 'detect'
  | 'batch'
  | 'metadata'
  | 'history'
  | 'ctf';

const MODULE_META: Record<ModuleId, { title: string; subtitle: string }> = {
  embed: {
    title: 'Embed payload',
    subtitle:
      'Conceal a message inside a lossless carrier using least-significant-bit substitution, with optional AES-256-GCM payload encryption.',
  },
  extract: {
    title: 'Extract payload',
    subtitle: 'Recover a previously embedded message from a stego file.',
  },
  detect: {
    title: 'Detect',
    subtitle: 'Run the full 10-detector steganalysis suite against a suspect file and get a weighted verdict.',
  },
  batch: {
    title: 'Batch',
    subtitle: 'Embed or detect across up to 25 files in a single operation. Batch embed outputs a single zip archive.',
  },
  metadata: {
    title: 'Metadata',
    subtitle: 'Strip EXIF, ICC profiles, XMP, and non-standard chunk data from image carriers via canvas re-encode.',
  },
  history: {
    title: 'History',
    subtitle: 'Session-local audit trail. Cleared when this tab closes — no data is ever persisted.',
  },
  ctf: {
    title: 'CTF Mode',
    subtitle: 'Multi-technique extraction with wordlist brute-forcing, hex preview, and automatic technique cycling.',
  },
};

const HANDLED_MODULES: ModuleId[] = [
  'embed', 'extract', 'detect', 'history', 'batch', 'metadata', 'ctf',
];

function WorkbenchView() {
  const [activeModule, setActiveModule] = useState<ModuleId>('embed');
  const meta = MODULE_META[activeModule];

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar active={activeModule} onSelect={setActiveModule} />
      <main className="flex-1 flex flex-col min-h-0">
        <PageHeader
          title={meta.title}
          subtitle={meta.subtitle}
          activeModule={activeModule}
        />
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-stgBg min-h-0">
          {activeModule === 'embed'    && <EmbedPanel />}
          {activeModule === 'extract'  && <ExtractPanel />}
          {activeModule === 'detect'   && <DetectPanel />}
          {activeModule === 'batch'    && <BatchPanel />}
          {activeModule === 'metadata' && <MetadataPanel />}
          {activeModule === 'history'  && <HistoryPanel />}
          {activeModule === 'ctf'      && <CTFPanel />}
          {!HANDLED_MODULES.includes(activeModule) && (
            <div className="text-stgTextSecondary text-sm">
              {meta.title} — coming soon.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AppShell() {
  const [activeView, setActiveView] = useState<TopLevelView>('workbench');

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar active={activeView} onSelect={setActiveView} />

      <div className="flex-1 flex min-h-0">
        {activeView === 'workbench'  && <WorkbenchView />}
        {activeView === 'forensics'  && <ForensicsPanel />}
        {activeView === 'training'   && <TrainingPanel />}
      </div>

      <Footer />
    </div>
  );
}