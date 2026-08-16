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
import { useEffect } from 'react';
import TermsModal from './TermsModal';

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

// cog

function WorkbenchView() {
  const [activeModule, setActiveModule] = useState<ModuleId>('embed');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = MODULE_META[activeModule];

  const handleModuleSelect = (id: ModuleId) => {
    setActiveModule(id);
    setSidebarOpen(false); // close on mobile after selection
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`
        fixed md:relative z-30 md:z-auto
        top-0 md:top-auto left-0 md:left-auto
        h-full md:h-auto
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar active={activeModule} onSelect={handleModuleSelect} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
        <PageHeader
          title={meta.title}
          subtitle={meta.subtitle}
          activeModule={activeModule}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-stgBg">
          {activeModule === 'embed'    && <EmbedPanel />}
          {activeModule === 'extract'  && <ExtractPanel />}
          {activeModule === 'detect'   && <DetectPanel />}
          {activeModule === 'batch'    && <BatchPanel />}
          {activeModule === 'metadata' && <MetadataPanel />}
          {activeModule === 'history'  && <HistoryPanel />}
          {activeModule === 'ctf'      && <CTFPanel />}
        </div>
      </main>
    </div>
  );
}

export default function AppShell() {
  const [activeView, setActiveView] = useState<TopLevelView>('workbench');
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    // Check if user has already accepted terms this browser session
    const accepted = localStorage.getItem('steganaliz_terms_accepted');
    setConsentGiven(accepted === 'v1');
    setConsentChecked(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('steganaliz_terms_accepted', 'v1');
    setConsentGiven(true);
  };

  if (!consentChecked) return null; // avoid flash

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {!consentGiven && (
        <TermsModal mode="gate" onAccept={handleAccept} />
      )}
      
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