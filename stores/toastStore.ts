import { create } from "zustand";

export type Toast = {
  id: string;
  text: string;
  createdAt: number; // ms
};

type ToastState = {
  toasts: Toast[];
  addToast: (text: string) => string; // returns id
  removeToast: (id: string) => void;
  clearExpired: (ttlMs: number) => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (text: string) => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { id, text, createdAt: Date.now() }] });
    return id;
  },
  removeToast: (id: string) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) });
  },
  clearExpired: (ttlMs: number) => {
    const cutoff = Date.now() - ttlMs;
    set({ toasts: get().toasts.filter(t => t.createdAt >= cutoff) });
  },
}));
