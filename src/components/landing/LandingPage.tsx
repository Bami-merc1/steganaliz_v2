import { useState, useEffect } from 'react';
import { workspaceApi } from '../../utils/workspaceApi';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  onPrivateMode: () => void;
  onWorkspaceReady: () => void;
}

type Panel = 'choose' | 'login' | 'register';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://steganaliz-api.onrender.com';

type ApiStatus = 'checking' | 'online' | 'cold-starting' | 'offline';

export default function LandingPage({ onPrivateMode, onWorkspaceReady }: Props) {
  const [panel, setPanel]       = useState<Panel>('choose');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const login = useAuthStore((s) => s.login);

  // Check API health on mount — handles Render cold start gracefully
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
        if (!cancelled) setApiStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) {
          // Likely cold start — retry after delay
          setApiStatus('cold-starting');
          setTimeout(async () => {
            try {
              const res2 = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(25000) });
              if (!cancelled) setApiStatus(res2.ok ? 'online' : 'offline');
            } catch {
              if (!cancelled) setApiStatus('offline');
            }
          }, 2000);
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const submit = async () => {
    setError(null);
    if (panel === 'register' && password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setIsLoading(true);
    try {
      const fn  = panel === 'login' ? workspaceApi.login : workspaceApi.register;
      const res = await fn(email, password);
      login(res.token, res.email, res.workspaceSalt, password);
      onWorkspaceReady();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const ApiStatusBadge = () => {
    const map: Record<ApiStatus, { color: string; text: string }> = {
      checking:     { color: 'text-stgTextMuted',  text: 'Checking server…' },
      online:       { color: 'text-stgSuccess',    text: 'Server online' },
      'cold-starting': { color: 'text-stgWarning', text: 'Server waking up (~30s)…' },
      offline:      { color: 'text-stgDanger',     text: 'Server offline — Workspace Mode unavailable' },
    };
    const { color, text } = map[apiStatus];
    return <span className={`text-xs ${color} flex items-center gap-1`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{text}</span>;
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-stgBg px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-4xl font-bold tracking-tight text-black">STEGAN</span>
            <span className="text-4xl font-bold tracking-tight text-stgOrange">ALIZ</span>
          </div>
          <p className="text-sm text-stgTextSecondary">Browser-based steganography & steganalysis workbench</p>
          <div className="mt-3 flex justify-center"><ApiStatusBadge /></div>
        </div>

        {panel === 'choose' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onPrivateMode}
              className="group border-2 border-stgBorder rounded-lg px-6 py-8 text-left hover:border-stgOrange transition-colors bg-white"
            >
              <div className="text-2xl mb-3">🔒</div>
              <h2 className="font-bold text-black text-lg mb-2">Private Mode</h2>
              <p className="text-sm text-stgTextSecondary leading-relaxed">
                No account. No storage. Everything stays in this tab and is gone when you close it.
              </p>
              <p className="text-xs text-stgTextMuted mt-4 group-hover:text-stgOrange transition-colors">
                Start immediately →
              </p>
            </button>

            <button
              onClick={() => apiStatus !== 'offline' && setPanel('login')}
              disabled={apiStatus === 'offline'}
              className={`group border-2 rounded-lg px-6 py-8 text-left transition-colors bg-white ${
                apiStatus === 'offline'
                  ? 'border-stgBorder opacity-50 cursor-not-allowed'
                  : 'border-stgBorder hover:border-stgOrange'
              }`}
            >
              <div className="text-2xl mb-3">🗂</div>
              <h2 className="font-bold text-black text-lg mb-2">Workspace Mode</h2>
              <p className="text-sm text-stgTextSecondary leading-relaxed">
                Save encrypted history, collaborate on CTF challenges, and run AI-powered steganalysis.
              </p>
              <p className={`text-xs mt-4 transition-colors ${apiStatus === 'offline' ? 'text-stgDanger' : 'text-stgTextMuted group-hover:text-stgOrange'}`}>
                {apiStatus === 'offline' ? 'Server unavailable' :
                 apiStatus === 'cold-starting' ? 'Waking server up…' :
                 'Sign in or register →'}
              </p>
            </button>
          </div>
        )}

        {(panel === 'login' || panel === 'register') && (
          <div className="bg-white border border-stgBorder rounded-lg px-8 py-8 space-y-5">
            <button onClick={() => { setPanel('choose'); setError(null); }} className="text-xs text-stgTextMuted hover:text-black">
              ← Back
            </button>
            <div>
              <h2 className="font-bold text-black text-xl">
                {panel === 'login' ? 'Sign in to Workspace' : 'Create Workspace Account'}
              </h2>
              <p className="text-xs text-stgTextMuted mt-1">
                Your files are encrypted in your browser before reaching our servers.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'EMAIL', value: email, set: setEmail, type: 'email', placeholder: 'you@example.com' },
                { label: 'PASSWORD', value: password, set: setPassword, type: 'password', placeholder: 'Min. 8 characters' },
                ...(panel === 'register' ? [{ label: 'CONFIRM PASSWORD', value: confirm, set: setConfirm, type: 'password', placeholder: 'Repeat password' }] : []),
              ].map(({ label, value, set, type, placeholder }) => (
                <div key={label}>
                  <label className="block text-xs font-medium tracking-wide text-stgTextSecondary mb-1">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded border border-stgBorderStrong bg-stgBg px-3 py-2.5 text-sm text-black focus:outline-none focus:border-stgOrange"
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-stgDanger">{error}</p>}

            {panel === 'register' && (
              <p className="text-xs text-stgTextMuted leading-relaxed">
                Your password encrypts your data before it leaves your browser. If you forget it, your saved history cannot be recovered — we cannot decrypt it.
              </p>
            )}

            <button
              onClick={submit}
              disabled={isLoading || !email || !password || apiStatus === 'offline'}
              className="w-full py-2.5 rounded text-sm font-bold bg-stgOrange text-white hover:bg-stgOrange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {isLoading
                ? (panel === 'login' ? 'Signing in…' : 'Creating account…')
                : (panel === 'login' ? 'Sign in' : 'Create account')}
            </button>

            <p className="text-center text-xs text-stgTextMuted">
              {panel === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setPanel(panel === 'login' ? 'register' : 'login'); setError(null); }} className="text-stgOrange hover:underline">
                {panel === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}