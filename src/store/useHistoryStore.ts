import { create } from 'zustand';
import type { HistoryEntry } from '../types';

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

// Session-local only, per project spec — state lives in memory for the tab's
// lifetime and is never persisted to localStorage/sessionStorage or any
// backend, so it's gone the moment the tab or session ends.
export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],

  addEntry: (entry) =>
    set((state) => ({
      entries: [
        {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
        ...state.entries,
      ],
    })),

  clear: () => set({ entries: [] }),
}));