import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'danger';

interface ToastState {
  message: string | null;
  variant: ToastVariant;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: 'info',
  show: (message, variant = 'info') => set({ message, variant }),
  hide: () => set({ message: null }),
}));
