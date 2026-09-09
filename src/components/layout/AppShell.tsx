import { useState, useEffect } from 'react';
import ApiStatusBar from './ApiStatusBar';
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
import DocsPanel from '../docs/DocsPanel';
import TermsModal from './TermsModal';
import LandingPage from '../landing/LandingPage';
import WorkspaceHistoryPanel from '../workspace/WorkspaceHistoryPanel';
import CTFRoomPanel from '../workspace/CTFRoomPanel';
import CNNAnalysisPanel from '../workspace/CNNAnalysisPanel';
import ComparisonPanel from '../workspace/ComparisonPanel';
import { useAuthStore } from '../../store/useAuthStore';

export type ModuleId =
  | 'embed' | 'extract' | 'detect' | 'batch' | 'metadata' | 'history' | 'ctf';

const MODULE_META: Record<ModuleId, { title: string; subtitle: string }> = {
  embed:    { title: 'Embed payload',    subtitle: 'Conceal a message inside a carrier using LSB substitution, metadata injection, or EOF append — with optional AES-256-GCM encryption.' },
  extract:  { title: 'Extract payload',  subtitle: 'Recover a previously embedded message from a stego file.' },
  detect:   { title: 'Detect',           subtitle: 'Run the full 12-detector steganalysis suite against a suspect file and get a weighted verdict.' },
  batch:    { title: 'Batch',            subtitle: 'Embed or detect across up to 25 files in a single operation. Batch embed outputs a single zip archive.' },
  metadata: { title: 'Metadata',         subtitle: 'Strip EXIF, ICC profiles, XMP, ID3 tags, and non-standard chunk data from carriers via re-encode or byte-level removal.' },
  history:  { title: 'History',          subtitle: 'Session-local audit trail. Cleared when this tab closes — no data is ever persisted in Private Mode.' },
  ctf: {
  title: 'CTF Solver',
  subtitle: 'Multi-technique payload extraction with wordlist brute-forcing, hex preview, and automatic engine cycling. For collaborative live CTF rooms, see Workspace → CTF Rooms.',},
};

// ── Workspace sub-view ────────────────────────────────────────────────────────

type WorkspaceTab = 'history' | 'ctf' | 'cnn' | 'compare';

function WorkspaceView() {
  const [tab, setTab] = useState<WorkspaceTab>('history');

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="bg-white border-b border-stgBorder px-4 md:px-8 flex gap-0 shrink-0 overflow-x-auto">
        {([
          ['history', 'Encrypted History'],
          ['ctf',     'CTF Rooms'],
          ['cnn',     'AI Steganalysis'],
          ['compare', 'Comparison'],
        ] as [WorkspaceTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
              tab === id
                ? 'border-stgOrange text-black font-semibold'
                : 'border-transparent text-stgTextSecondary hover:text-black'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-stgBg">
        {tab === 'history' && <WorkspaceHistoryPanel />}
        {tab === 'ctf'     && <CTFRoomPanel />}
        {tab === 'cnn'     && <CNNAnalysisPanel />}
        {tab === 'compare' && <ComparisonPanel />}
      </div>
    </div>
  );
}

// ── Workbench sub-view ────────────────────────────────────────────────────────

function WorkbenchView() {
  const [activeModule, setActiveModule] = useState<ModuleId>('embed');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const meta = MODULE_META[activeModule];

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-20" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed md:relative z-30 md:z-auto top-0 md:top-auto left-0 h-full md:h-auto transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar active={activeModule} onSelect={(id) => { setActiveModule(id); setSidebarOpen(false); }} />
      </div>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
        <PageHeader title={meta.title} subtitle={meta.subtitle} activeModule={activeModule} onMenuClick={() => setSidebarOpen(true)} />
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

// ── Root shell ────────────────────────────────────────────────────────────────

export default function AppShell() {
  const [activeView, setActiveView]   = useState<TopLevelView>('workbench');
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const { isWorkspaceMode, logout }   = useAuthStore();

  useEffect(() => {
    const accepted = localStorage.getItem('steganaliz_terms_accepted');
    setConsentGiven(accepted === 'v1');
    // Restore mode from session (survives page refresh within same tab)
    const mode = sessionStorage.getItem('stgz_mode');
    if (mode) setShowLanding(false);
    // Restore JWT from sessionStorage if present
    const token = sessionStorage.getItem('stgz_token');
    if (!token && mode === 'workspace') {
      // Token expired or missing — force back to landing
      sessionStorage.removeItem('stgz_mode');
      setShowLanding(true);
    }
    setConsentChecked(true);
  }, []);

  // If JWT expires mid-session, catch 401s globally and log out
  useEffect(() => {
    const handleStorageChange = () => {
      const token = sessionStorage.getItem('stgz_token');
      if (!token && isWorkspaceMode) logout();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isWorkspaceMode, logout]);

  const handleAccept = () => {
    localStorage.setItem('steganaliz_terms_accepted', 'v1');
    setConsentGiven(true);
  };

  const handlePrivateMode = () => {
    sessionStorage.setItem('stgz_mode', 'private');
    setShowLanding(false);
  };

  const handleWorkspaceReady = () => {
    sessionStorage.setItem('stgz_mode', 'workspace');
    setShowLanding(false);
    setActiveView('workspace');
  };

  const handleLogout = () => {
    logout();
    sessionStorage.removeItem('stgz_mode');
    sessionStorage.removeItem('stgz_token');
    setShowLanding(true);
    setActiveView('workbench');
  };

  if (!consentChecked) return null;

  if (!consentGiven) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <TermsModal mode="gate" onAccept={handleAccept} />
      </div>
    );
  }

  if (showLanding) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-stgBg">
        <LandingPage onPrivateMode={handlePrivateMode} onWorkspaceReady={handleWorkspaceReady} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ApiStatusBar />

      <Navbar
        active={activeView}
        onSelect={setActiveView}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex min-h-0">
        {activeView === 'workbench' && <WorkbenchView />}
        {activeView === 'forensics' && <ForensicsPanel />}
        {activeView === 'training'  && <TrainingPanel />}
        {activeView === 'docs'      && <DocsPanel />}
        {activeView === 'workspace' && <WorkspaceView />}
      </div>
      <Footer />
    </div>
  );
}