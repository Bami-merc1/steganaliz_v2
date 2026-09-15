// src/store/useAuthStore.ts
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

export const useAuthStore = create<AuthState>((set) => {
  // Only restore token if ALL required fields exist in sessionStorage
  const token    = sessionStorage.getItem('stgz_token');
  const email    = sessionStorage.getItem('stgz_email');
  const salt     = sessionStorage.getItem('stgz_salt');
  // sessionPassword is never persisted — user must re-login if tab closes
  const valid    = !!(token && email && salt);

  if (!valid) {
    sessionStorage.removeItem('stgz_token');
    sessionStorage.removeItem('stgz_email');
    sessionStorage.removeItem('stgz_salt');
    sessionStorage.removeItem('stgz_mode');
  }

  return {
    token:           valid ? token : null,
    email:           valid ? email : null,
    workspaceSalt:   valid ? salt  : null,
    sessionPassword: null,   // never persisted — requires re-login each session
    isWorkspaceMode: valid,

    login: (token, email, workspaceSalt, password) => {
      sessionStorage.setItem('stgz_token', token);
      sessionStorage.setItem('stgz_email', email);
      sessionStorage.setItem('stgz_salt',  workspaceSalt);
      sessionStorage.setItem('stgz_mode',  'workspace');
      set({ token, email, workspaceSalt, sessionPassword: password, isWorkspaceMode: true });
    },

    logout: () => {
      ['stgz_token','stgz_email','stgz_salt','stgz_mode'].forEach(
        (k) => sessionStorage.removeItem(k)
      );
      set({ token: null, email: null, workspaceSalt: null, sessionPassword: null, isWorkspaceMode: false });
    },
  };
});