import { create } from 'zustand';

type ModalType = 'addAccount' | 'addTransaction' | 'addInvestment' | 'addGoal' | 'addLoan' | null;

interface UIState {
  activeModal: ModalType;
  loading: Set<string>;
  theme: 'light' | 'dark' | 'system';

  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  addLoading: (key: string) => void;
  removeLoading: (key: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  loading: new Set(),
  theme: 'system',

  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),

  addLoading: (key) => set((s) => {
    const next = new Set(s.loading);
    next.add(key);
    return { loading: next };
  }),

  removeLoading: (key) => set((s) => {
    const next = new Set(s.loading);
    next.delete(key);
    return { loading: next };
  }),

  setTheme: (theme) => set({ theme }),
}));
