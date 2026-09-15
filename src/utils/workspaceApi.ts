import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? sessionStorage.getItem('stgz_token');
}

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const authToken = token ?? await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    const { useAuthStore } = await import('../store/useAuthStore');
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
  _id:       string;
  encryptedBlob: string;
  iv:        string;
  salt:      string;
  entryType: string;
  createdAt: string;
}

export const workspaceApi = {
  // Auth now goes through Supabase — these remain for legacy/fallback
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Check your email to confirm your account before signing in.');
    const token = data.session.access_token;
    // Get or create workspace salt from our backend
    const res = await apiFetch('/api/auth/sync', { method: 'POST' }, token);
    return { token, workspaceSalt: res.workspaceSalt, email };
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const token = data.session.access_token;
    const res = await apiFetch('/api/auth/sync', { method: 'POST' }, token);
    return { token, workspaceSalt: res.workspaceSalt, email };
  },

  resetPassword: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=true`,
    });
    if (error) throw new Error(error.message);
  },

  getEntries: (token: string): Promise<WorkspaceEntryResponse[]> =>
    apiFetch('/api/workspace/entries', {}, token),

  saveEntry: (token: string, payload: { encryptedBlob: string; iv: string; salt: string; entryType: string }) =>
    apiFetch('/api/workspace/entries', { method: 'POST', body: JSON.stringify(payload) }, token),

  deleteEntry: (token: string, id: string): Promise<void> =>
    apiFetch(`/api/workspace/entries/${id}`, { method: 'DELETE' }, token),

  clearEntries: (token: string): Promise<void> =>
    apiFetch('/api/workspace/entries', { method: 'DELETE' }, token),
};