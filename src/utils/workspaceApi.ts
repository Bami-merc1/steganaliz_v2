import { useAuthStore } from '../store/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL || '';
async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  // Auto-logout on expired/invalid JWT
  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json;
}

export interface AuthResponse {
  token:         string;
  workspaceSalt: string;
  email:         string;
}

export interface WorkspaceEntryResponse {
  _id:           string;
  encryptedBlob: string;
  iv:            string;
  salt:          string;
  entryType:     string;
  createdAt:     string;
}

export const workspaceApi = {
  register: (email: string, password: string): Promise<AuthResponse> =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string): Promise<AuthResponse> =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  deleteAccount: (token: string): Promise<void> =>
    apiFetch('/api/auth/account', { method: 'DELETE' }, token),

  getEntries: (token: string): Promise<WorkspaceEntryResponse[]> =>
    apiFetch('/api/workspace/entries', {}, token),

  saveEntry: (
    token: string,
    payload: { encryptedBlob: string; iv: string; salt: string; entryType: string }
  ): Promise<{ id: string; createdAt: string }> =>
    apiFetch('/api/workspace/entries', { method: 'POST', body: JSON.stringify(payload) }, token),

  deleteEntry: (token: string, id: string): Promise<void> =>
    apiFetch(`/api/workspace/entries/${id}`, { method: 'DELETE' }, token),

  clearEntries: (token: string): Promise<void> =>
    apiFetch('/api/workspace/entries', { method: 'DELETE' }, token),
};