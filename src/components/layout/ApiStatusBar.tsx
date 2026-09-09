import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://steganaliz-api.onrender.com';

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
        if (!cancelled) { setShow(true); setWaking(true); }
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  return (
    <div className="bg-stgWarning/10 border-b border-stgWarning/30 px-4 py-2 text-xs text-stgWarning flex items-center justify-between">
      <span>
        {waking
          ? '⏳ Workspace server is waking up — this takes ~30 seconds on the free tier. Private Mode works without it.'
          : '⚠️ Workspace server is unavailable. Private Mode is unaffected.'}
      </span>
      <button onClick={() => setShow(false)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}