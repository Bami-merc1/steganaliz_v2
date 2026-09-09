import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ApiStatusBar() {
  const [show, setShow]     = useState(false);
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
        if (!cancelled && !res.ok) setShow(true);
      } catch {
        if (!cancelled) {
          setShow(true);
          setWaking(true);

          // Retry every 10 seconds silently
          const retryId = setInterval(async () => {
            if (cancelled) { clearInterval(retryId); return; }
            try {
              const res2 = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) });
              if (res2.ok && !cancelled) {
                setShow(false);
                setWaking(false);
                clearInterval(retryId);
              }
            } catch { /* still waking */ }
          }, 10_000);
        }
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  return (
    <div className="bg-stgWarning/10 border-b border-stgWarning/30 px-4 py-2 text-xs text-stgWarning flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-stgWarning animate-pulse" />
        {waking
          ? 'Workspace server is waking up — this takes ~30 seconds on the free tier. Private Mode works without it.'
          : 'Workspace server is unavailable. Private Mode is unaffected.'}
      </span>
      <button onClick={() => setShow(false)} className="ml-4 opacity-60 hover:opacity-100 shrink-0">✕</button>
    </div>
  );
}