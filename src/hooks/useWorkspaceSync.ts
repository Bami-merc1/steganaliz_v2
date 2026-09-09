// Wraps addEntry so that when a user is in Workspace Mode,
// the entry is saved to both the local session store AND the encrypted API.
import { useHistoryStore } from '../store/useHistoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { workspaceApi } from '../utils/workspaceApi';
import { encryptWorkspaceEntry } from '../utils/workspaceCrypto';

type EntryInput = {
  action: 'embed' | 'extract' | 'detect' | 'batch-embed' | 'batch-detect' | 'metadata-strip';
  fileName: string;
  detail: string;
};

export function useWorkspaceSync() {
  const addLocalEntry = useHistoryStore((s) => s.addEntry);
  const { token, sessionPassword, workspaceSalt, isWorkspaceMode } = useAuthStore();

  const addEntry = async (entry: EntryInput) => {
    // Always save locally (in-memory session store)
    addLocalEntry(entry);

    // If in workspace mode, also encrypt and persist to the API
    if (!isWorkspaceMode || !token || !sessionPassword || !workspaceSalt) return;

    try {
      const { encryptedBlob, iv, salt } = await encryptWorkspaceEntry(
        { ...entry, timestamp: Date.now() },
        sessionPassword,
        workspaceSalt
      );
      await workspaceApi.saveEntry(token, {
        encryptedBlob,
        iv,
        salt,
        entryType: entry.action,
      });
    } catch {
      // Workspace sync failure is silent — local history is already saved
      console.warn('Workspace sync failed for entry — saved locally only.');
    }
  };

  return { addEntry };
}