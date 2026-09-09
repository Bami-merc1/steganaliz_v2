import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { workspaceApi, type WorkspaceEntryResponse } from '../../utils/workspaceApi';
import { decryptWorkspaceEntry, } from '../../utils/workspaceCrypto';
import Button from '../shared/Button';

interface DecryptedEntry {
  id: string;
  entryType: string;
  createdAt: string;
  data: {
    action: string;
    fileName: string;
    detail: string;
    timestamp: number;
  };
}

export default function WorkspaceHistoryPanel() {
  const { token, sessionPassword, workspaceSalt, email, logout, isWorkspaceMode } = useAuthStore();
  const [entries, setEntries] = useState<DecryptedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!token || !sessionPassword || !workspaceSalt) return;
    loadEntries();
  }, [token]);


  if (!isWorkspaceMode || !token) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white border border-stgBorder rounded px-6 py-12 text-center space-y-3">
          <p className="text-2xl">🔒</p>
          <p className="font-semibold text-black">Workspace Mode required</p>
          <p className="text-sm text-stgTextSecondary">
            Sign in to access encrypted history, CTF rooms, and AI steganalysis.
          </p>
        </div>
      </div>
    );
  }

  
  const loadEntries = async () => {
    if (!token || !sessionPassword || !workspaceSalt) return;
    setIsLoading(true);
    setError(null);
    try {
      const raw = await workspaceApi.getEntries(token);
      const decrypted = await Promise.all(
        raw.map(async (e: WorkspaceEntryResponse) => {
          try {
            const data = await decryptWorkspaceEntry(e.encryptedBlob, e.iv, e.salt, sessionPassword);
            return { id: e._id, entryType: e.entryType, createdAt: e.createdAt, data } as DecryptedEntry;
          } catch {
            return null; // corrupted or wrong password — skip silently
          }
        })
      );
      setEntries(decrypted.filter(Boolean) as DecryptedEntry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workspace history.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!token) return;
    await workspaceApi.deleteEntry(token, id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const clearAll = async () => {
    if (!token) return;
    setIsClearing(true);
    await workspaceApi.clearEntries(token);
    setEntries([]);
    setIsClearing(false);
  };

  const ACTION_COLORS: Record<string, string> = {
    embed: 'text-stgOrange',
    extract: 'text-stgSuccess',
    detect: 'text-stgWarning',
    'batch-embed': 'text-stgOrange',
    'batch-detect': 'text-stgWarning',
    'metadata-strip': 'text-stgTextMuted',
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Account header */}
      <div className="flex items-center justify-between bg-white border border-stgBorder rounded px-4 py-3">
        <div>
          <p className="text-xs text-stgTextMuted">Signed in as</p>
          <p className="text-sm font-semibold text-black">{email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadEntries}>Refresh</Button>
          <Button variant="secondary" onClick={logout}>Sign out</Button>
        </div>
      </div>

      <div className="bg-stgOrangeSoft/40 border border-stgOrange/30 rounded px-4 py-3 text-xs text-stgTextSecondary">
        🔒 All entries are encrypted in your browser before storage. The server holds only unreadable ciphertext.
      </div>

      {error && <p className="text-xs text-stgDanger">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-stgTextMuted text-center py-8">Decrypting workspace entries…</p>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-stgBorder rounded px-6 py-10 text-center">
          <p className="text-stgTextMuted text-sm">No workspace history yet.</p>
          <p className="text-stgTextMuted text-xs mt-1">
            Switch to the Workbench tab — actions will be saved here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="mono text-xs text-stgTextMuted">{entries.length} encrypted entries</p>
            <Button variant="secondary" onClick={clearAll} disabled={isClearing}>
              {isClearing ? 'Clearing…' : 'Clear all'}
            </Button>
          </div>

          <div className="bg-white border border-stgBorder rounded overflow-hidden">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-4 py-3 text-sm ${i < entries.length - 1 ? 'border-b border-stgBorder' : ''}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold capitalize ${ACTION_COLORS[entry.data.action] ?? 'text-stgTextMuted'}`}>
                      {entry.data.action}
                    </span>
                    <span className="text-stgTextSecondary truncate text-xs">{entry.data.fileName}</span>
                  </div>
                  <p className="text-xs text-stgTextMuted mt-0.5">{entry.data.detail}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="mono text-xs text-stgTextMuted">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="text-xs text-stgTextMuted hover:text-stgDanger"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}