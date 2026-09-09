const API_BASE = import.meta.env.VITE_API_URL ?? 'https://steganaliz-api.onrender.com';

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export interface RoomSummary {
  code: string;
  title: string;
  status: 'open' | 'closed';
  hostEmail: string;
  participantCount: number;
  solvedCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface RoomDetail {
  code: string;
  title: string;
  hint: string;
  hostEmail: string;
  challengeFileB64: string;
  challengeFileName: string;
  challengeFileMime: string;
  participants: {
    email: string;
    solved: boolean;
    solvedAt?: string;
    attempts: number;
  }[];
  status: 'open' | 'closed';
  expiresAt: string;
}

export interface SubmitResult {
  correct: boolean;
  attempts: number;
  leaderboard: { email: string; solvedAt: string; attempts: number }[];
}

export const ctfApi = {
  createRoom: (
    token: string,
    payload: {
      title: string;
      hint: string;
      challengeFileB64: string;
      challengeFileName: string;
      challengeFileMime: string;
      solution: string;
    }
  ): Promise<{ code: string; title: string; createdAt: string; expiresAt: string }> =>
    apiFetch('/api/ctf/rooms', { method: 'POST', body: JSON.stringify(payload) }, token),

  getRoom: (token: string, code: string): Promise<RoomDetail> =>
    apiFetch(`/api/ctf/rooms/${code}`, {}, token),

  submitAnswer: (token: string, code: string, answer: string): Promise<SubmitResult> =>
    apiFetch(`/api/ctf/rooms/${code}/submit`, { method: 'POST', body: JSON.stringify({ answer }) }, token),

  listRooms: (token: string): Promise<RoomSummary[]> =>
    apiFetch('/api/ctf/rooms', {}, token),

  closeRoom: (token: string, code: string): Promise<void> =>
    apiFetch(`/api/ctf/rooms/${code}/close`, { method: 'PATCH' }, token),
};