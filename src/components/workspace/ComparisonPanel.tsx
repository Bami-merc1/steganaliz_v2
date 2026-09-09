import { useEffect, useState } from 'react';
import Button from '../shared/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { encryptWorkspaceEntry, decryptWorkspaceEntry } from '../../utils/workspaceCrypto';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://steganaliz-api.onrender.com';

// Thin fetch wrapper consistent with workspaceApi.ts pattern
async function compApi(path: string, method = 'GET', body?: object, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Session expired.');
  }
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Request failed');
  return json;
}

interface SavedAnalysisRaw {
  _id:           string;
  label:         string;
  encryptedBlob: string;
  iv:            string;
  salt:          string;
  fileHash:      string;
  createdAt:     string;
}

interface VerdictData {
  fileName:     string;
  overallScore: number;
  overallLabel: string;
  detectors:    { name: string; score: number; label: string }[];
  savedAt:      string;
}

type DecryptedEntry = VerdictData & { id: string; label: string };

export default function ComparisonPanel() {
  const { token, sessionPassword, workspaceSalt, isWorkspaceMode } = useAuthStore();
  const [decrypted, setDecrypted] = useState<DecryptedEntry[]>([]);
  const [selected,  setSelected]  = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Workspace gate
  if (!isWorkspaceMode || !token) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white border border-stgBorder rounded px-6 py-12 text-center space-y-3">
          <p className="text-2xl">🔒</p>
          <p className="font-semibold text-black">Workspace Mode required</p>
          <p className="text-sm text-stgTextSecondary">Sign in to save and compare steganalysis results.</p>
        </div>
      </div>
    );
  }

  useEffect(() => { load(); }, [token]);

  const load = async () => {
    if (!token || !sessionPassword) return;
    setIsLoading(true);
    setError(null);
    try {
      const raw: SavedAnalysisRaw[] = await compApi('/api/comparison/analyses', 'GET', undefined, token);
      const dec = await Promise.all(
        raw.map(async (e) => {
          try {
            const data = await decryptWorkspaceEntry<VerdictData>(
              e.encryptedBlob, e.iv, e.salt, sessionPassword
            );
            return { ...data, id: e._id, label: e.label } as DecryptedEntry;
          } catch { return null; }
        })
      );
      setDecrypted(dec.filter(Boolean) as DecryptedEntry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load saved analyses.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!token) return;
    try {
      await compApi(`/api/comparison/analyses/${id}`, 'DELETE', undefined, token);
      setDecrypted((prev) => prev.filter((e) => e.id !== id));
      setSelected((prev) => prev.filter((s) => s !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id].slice(-3)
    );

  const comparing = decrypted.filter((e) => selected.includes(e.id));

  const LABEL_COLOR: Record<string, string> = {
    CLEAN: 'text-stgSuccess', SUSPICIOUS: 'text-stgWarning', STEGO: 'text-stgDanger',
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-stgTextSecondary leading-relaxed">
        Save steganalysis verdicts from the Detect tab, then compare results across files
        or sessions side-by-side. All data is encrypted before storage.
      </p>

      {error && <p className="text-xs text-stgDanger">{error}</p>}

      {isLoading ? (
        <p className="text-xs text-stgTextMuted text-center py-8">Decrypting saved analyses…</p>
      ) : decrypted.length === 0 ? (
        <div className="bg-white border border-stgBorder rounded px-6 py-10 text-center space-y-2">
          <p className="text-stgTextMuted text-sm">No saved analyses yet.</p>
          <p className="text-xs text-stgTextMuted">
            In the Detect tab, after running detection, click <strong>Save to comparison</strong>.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-stgTextMuted">Select up to 3 to compare side-by-side.</p>
            <Button variant="secondary" onClick={load}>Refresh</Button>
          </div>

          <div className="border border-stgBorder rounded overflow-hidden bg-white">
            {decrypted.map((e, i) => (
              <div
                key={e.id}
                onClick={() => toggleSelect(e.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  selected.includes(e.id) ? 'bg-stgOrangeSoft/40' : 'hover:bg-stgBg'
                } ${i < decrypted.length - 1 ? 'border-b border-stgBorder' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(e.id)}
                  onChange={() => toggleSelect(e.id)}
                  className="accent-stgOrange"
                  onClick={(ev) => ev.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{e.label}</p>
                  <p className="text-xs text-stgTextMuted truncate">{e.fileName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${LABEL_COLOR[e.overallLabel] ?? ''}`}>
                    {e.overallLabel} {e.overallScore}%
                  </p>
                  <p className="text-xs text-stgTextMuted">{new Date(e.savedAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); }}
                  className="text-xs text-stgTextMuted hover:text-stgDanger ml-2 shrink-0"
                >✕</button>
              </div>
            ))}
          </div>

          {comparing.length >= 2 && (
            <div>
              <p className="text-xs font-medium tracking-wide text-stgTextSecondary mb-3">
                COMPARISON — {comparing.length} analyses
              </p>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${comparing.length}, 1fr)` }}
              >
                {comparing.map((e) => (
                  <div key={e.id} className="border border-stgBorder rounded bg-white overflow-hidden">
                    <div className="px-3 py-2 bg-stgBg border-b border-stgBorder">
                      <p className="text-xs font-semibold text-black truncate">{e.label}</p>
                      <p className="text-xs text-stgTextMuted truncate">{e.fileName}</p>
                    </div>
                    <div className="px-3 py-3 border-b border-stgBorder">
                      <div className={`text-center py-2 rounded font-bold text-sm ${LABEL_COLOR[e.overallLabel] ?? ''}`}>
                        {e.overallLabel} — {e.overallScore}%
                      </div>
                      <div className="h-1.5 rounded-full bg-stgBg mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${e.overallScore}%`,
                            background: e.overallLabel === 'STEGO' ? '#c4544a' :
                                        e.overallLabel === 'SUSPICIOUS' ? '#c9a15c' : '#4a7d5e',
                          }}
                        />
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      {e.detectors?.map((d) => (
                        <div key={d.name} className="flex items-center justify-between py-1.5 border-b border-stgBorder last:border-0">
                          <span className="text-xs text-stgTextSecondary truncate flex-1">{d.name}</span>
                          <span className={`mono text-xs font-semibold ml-2 ${LABEL_COLOR[d.label] ?? ''}`}>
                            {d.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}