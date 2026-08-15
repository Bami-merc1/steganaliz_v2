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
    subtitle: 'Run the full steganalysis suite against a suspect file.',
  },
  batch: {
    title: 'Batch',
    subtitle: 'Embed or detect across up to 25 files in a single operation.',
  },
  metadata: {
    title: 'Metadata',
    subtitle: 'Strip metadata and known hidden-data markers from a file.',
  },
  history: {
    title: 'History',
    subtitle: 'Session-local audit trail. Cleared when this tab closes.',
  },
  ctf: {
    title: 'CTF mode',
    subtitle: 'Multi-technique extraction, wordlist brute-forcing, and hex inspection.',
  },
};

const HANDLED_MODULES: ModuleId[] = ['embed', 'extract', 'detect', 'history', 'batch', 'metadata', 'ctf'];

function WorkbenchView() {
  const [activeModule, setActiveModule] = useState<ModuleId>('embed');
  const meta = MODULE_META[activeModule];

  return (
    <div className="flex-1 flex">
      <Sidebar active={activeModule} onSelect={setActiveModule} />
      <main className="flex-1 flex flex-col">
        <PageHeader title={meta.title} subtitle={meta.subtitle} activeModule={activeModule} />
        <div className="flex-1 px-8 py-6">
          {activeModule === 'embed' && <EmbedPanel />}
          {activeModule === 'extract' && <ExtractPanel />}
          {activeModule === 'detect' && <DetectPanel />}
          {activeModule === 'batch' && <BatchPanel />}
          {activeModule === 'metadata' && <MetadataPanel />}
          {activeModule === 'history' && <HistoryPanel />}
          {activeModule === 'ctf' && <CTFPanel />}
          {!HANDLED_MODULES.includes(activeModule) && (
            <div className="text-stgTextSecondary text-sm">{meta.title} module — coming next.</div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AppShell() {
  const [activeView, setActiveView] = useState<TopLevelView>('workbench');

  return (
    <div className="min-h-screen bg-stgBg flex flex-col">
      <Navbar active={activeView} onSelect={setActiveView} />
      {activeView === 'workbench' && <WorkbenchView />}
      {activeView === 'forensics' && <ForensicsPanel />}
      {activeView === 'training' && <TrainingPanel />}
      {activeView === 'forensics' && (
        <div className="flex-1 flex items-center justify-center text-sm text-stgTextSecondary">
        </div>
      )}
      <Footer />
    </div>
  );
}