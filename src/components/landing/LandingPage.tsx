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
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const ping = async (): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE}/health`, {
          signal: AbortSignal.timeout(8000),
        });
        return res.ok;
      } catch {
        return false;
      }
    };

    const startPolling = async () => {
      // First check
      const alive = await ping();
      if (cancelled) return;

      if (alive) {
        setApiStatus('online');
      } else {
        setApiStatus('cold-starting');
        // Poll every 10 seconds until it wakes up
        intervalId = setInterval(async () => {
          if (cancelled) return;
          const awake = await ping();
          if (awake && !cancelled) {
            setApiStatus('online');
            if (intervalId) clearInterval(intervalId);
          }
        }, 10_000);
      }

      // Keep-alive ping every 60 seconds while user is on this page
      // (supplements the GitHub Actions cron)
      const keepAliveId = setInterval(async () => {
        if (!cancelled) await ping();
      }, 60_000);

      return () => {
        clearInterval(keepAliveId);
      };
    };

    startPolling();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
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
    const [dots, setDots] = useState('');

    useEffect(() => {
      if (apiStatus !== 'cold-starting') return;
      const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
      return () => clearInterval(id);
    }, [apiStatus]);

    const map: Record<ApiStatus, { color: string; text: string }> = {
      checking:        { color: 'text-stgTextMuted',  text: 'Checking server…' },
      online:          { color: 'text-stgSuccess',    text: 'Server online' },
      'cold-starting': { color: 'text-stgWarning',    text: `Waking server up${dots} (~30s)` },
      offline:         { color: 'text-stgDanger',     text: 'Server offline — Workspace Mode unavailable' },
    };
    const { color, text } = map[apiStatus];
    return (
      <span className={`text-xs ${color} flex items-center gap-1.5`}>
        <span className={`w-1.5 h-1.5 rounded-full bg-current ${apiStatus === 'cold-starting' ? 'animate-pulse' : ''}`} />
        {text}
      </span>
    );
  };

  // Replace the return statement with:
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--sp-6) var(--sp-4)',
      background: 'var(--clr-bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Logo block */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: -1, color: 'var(--clr-text-primary)' }}>
              STEGAN
            </span>
            <span style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: -1, color: 'var(--clr-orange)' }}>
              ALIZ
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--clr-text-muted)', marginBottom: 12 }}>
            Browser-based steganography &amp; steganalysis workbench
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ApiStatusBadge />
          </div>
        </div>

        {panel === 'choose' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            {/* Private Mode */}
            <button
              onClick={onPrivateMode}
              style={{
                background: '#fff',
                border: '2px solid var(--clr-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--sp-5)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--clr-orange)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--clr-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 10 }}>🔒</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: 6 }}>
                Private Mode
              </p>
              <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', lineHeight: 1.5 }}>
                No account. No storage. Everything stays in this tab.
              </p>
              <p style={{ fontSize: 12, color: 'var(--clr-orange)', marginTop: 12, fontWeight: 500 }}>
                Start now →
              </p>
            </button>

            {/* Workspace Mode */}
            <button
              onClick={() => apiStatus !== 'offline' && setPanel('login')}
              disabled={apiStatus === 'offline'}
              style={{
                background: '#fff',
                border: '2px solid var(--clr-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--sp-5)',
                textAlign: 'left',
                cursor: apiStatus === 'offline' ? 'not-allowed' : 'pointer',
                opacity: apiStatus === 'offline' ? 0.5 : 1,
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onMouseEnter={(e) => {
                if (apiStatus === 'offline') return;
                e.currentTarget.style.borderColor = 'var(--clr-orange)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--clr-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 10 }}>🗂</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: 6 }}>
                Workspace
              </p>
              <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', lineHeight: 1.5 }}>
                Encrypted history, CTF rooms, AI analysis.
              </p>
              <p style={{
                fontSize: 12,
                marginTop: 12,
                fontWeight: 500,
                color: apiStatus === 'offline' ? 'var(--clr-danger)' :
                      apiStatus === 'cold-starting' ? 'var(--clr-warning)' : 'var(--clr-orange)',
              }}>
                {apiStatus === 'offline' ? 'Unavailable' :
                apiStatus === 'cold-starting' ? `Waking up${dots}` : 'Sign in →'}
              </p>
            </button>
          </div>
        )}

        {(panel === 'login' || panel === 'register') && (
          <div style={{
            background: '#fff',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(20px, 5vw, 36px)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <button
              onClick={() => { setPanel('choose'); setError(null); }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: 'var(--clr-text-muted)',
                cursor: 'pointer',
                marginBottom: 20,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ← Back
            </button>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: 4 }}>
              {panel === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', marginBottom: 24 }}>
              Your files are encrypted in your browser before reaching our servers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Email',            value: email,    set: setEmail,    type: 'email',    placeholder: 'you@example.com' },
                { label: 'Password',         value: password, set: setPassword, type: 'password', placeholder: 'Min. 8 characters' },
                ...(panel === 'register' ? [{ label: 'Confirm password', value: confirm, set: setConfirm, type: 'password', placeholder: 'Repeat password' }] : []),
              ].map(({ label, value, set, type, placeholder }) => (
                <div key={label}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--clr-text-secondary)',
                    marginBottom: 6,
                  }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 14,
                      border: '1px solid var(--clr-border-strong)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--clr-bg)',
                      color: 'var(--clr-text-primary)',
                      outline: 'none',
                      transition: 'border-color .15s',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--clr-orange)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--clr-border-strong)'}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                  />
                </div>
              ))}
            </div>

            {error && (
              <p style={{ fontSize: 12, color: 'var(--clr-danger)', marginTop: 12 }}>{error}</p>
            )}

            {panel === 'register' && (
              <p style={{ fontSize: 11, color: 'var(--clr-text-muted)', marginTop: 14, lineHeight: 1.6 }}>
                If you forget your password, your saved history cannot be recovered — we cannot decrypt it.
              </p>
            )}

            <button
              onClick={submit}
              disabled={isLoading || !email || !password || apiStatus === 'offline'}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '12px',
                fontSize: 14,
                fontWeight: 700,
                background: 'var(--clr-orange)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: isLoading || !email || !password ? 'not-allowed' : 'pointer',
                opacity: isLoading || !email || !password ? 0.4 : 1,
                transition: 'opacity .15s, background .15s',
              }}
              onMouseEnter={(e) => { if (!isLoading && email && password) e.currentTarget.style.background = 'var(--clr-orange-dim)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--clr-orange)'; }}
            >
              {isLoading
                ? (panel === 'login' ? 'Signing in…' : 'Creating account…')
                : (panel === 'login' ? 'Sign in' : 'Create account')}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--clr-text-muted)', marginTop: 16 }}>
              {panel === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setPanel(panel === 'login' ? 'register' : 'login'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--clr-orange)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {panel === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}