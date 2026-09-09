import { create } from 'zustand';

interface AuthState {
  token:           string | null;
  email:           string | null;
  workspaceSalt:   string | null;
  sessionPassword: string | null;
  isWorkspaceMode: boolean;
  login:  (token: string, email: string, workspaceSalt: string, password: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token:           sessionStorage.getItem('stgz_token'),
  email:           null,
  workspaceSalt:   null,
  sessionPassword: null,
  isWorkspaceMode: !!sessionStorage.getItem('stgz_token'),

  login: (token, email, workspaceSalt, password) => {
    sessionStorage.setItem('stgz_token', token);
    sessionStorage.setItem('stgz_mode',  'workspace');
    set({ token, email, workspaceSalt, sessionPassword: password, isWorkspaceMode: true });
  },

  logout: () => {
    sessionStorage.removeItem('stgz_token');
    sessionStorage.removeItem('stgz_mode');
    set({
      token:           null,
      email:           null,
      workspaceSalt:   null,
      sessionPassword: null,
      isWorkspaceMode: false,
    });
  },
}));