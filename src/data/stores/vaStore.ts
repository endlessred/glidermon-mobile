// src/data/stores/vaStore.ts
import { Platform } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type VirtuAcornLedgerEntry = {
  id: string;
  amount: number;
  reason?: string;
  timestamp: number;
  kind: "earn" | "spend";
};

type VirtuAcornState = {
  total: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  ledger: VirtuAcornLedgerEntry[];
  _rehydrated: boolean;
  earn: (amount: number, reason?: string) => void;
  spend: (amount: number, reason?: string) => boolean;
  setTotal: (amount: number) => void;
  reset: () => void;
};

const STORAGE_VERSION = 1;
const MAX_LEDGER_ENTRIES = 50;

const storage = createJSONStorage(() =>
  Platform.OS === "web"
    ? {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
        removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
      }
    : AsyncStorage
);

const trimLedger = (entries: VirtuAcornLedgerEntry[]): VirtuAcornLedgerEntry[] => {
  if (entries.length <= MAX_LEDGER_ENTRIES) return entries;
  return entries.slice(entries.length - MAX_LEDGER_ENTRIES);
};

export const useVirtuAcornStore = create<VirtuAcornState>()(
  persist(
    (set, get) => ({
      total: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      ledger: [],
      _rehydrated: false,

      earn: (amount, reason) => {
        if (!amount || !Number.isFinite(amount)) return;
        const positive = Math.max(0, Math.round(amount));
        if (!positive) return;
        const ts = Date.now();
        const entry: VirtuAcornLedgerEntry = {
          id: `${ts}-earn-${Math.random().toString(36).slice(2, 8)}`,
          amount: positive,
          reason,
          timestamp: ts,
          kind: "earn",
        };

        set((state) => ({
          total: state.total + positive,
          lifetimeEarned: state.lifetimeEarned + positive,
          ledger: trimLedger([...state.ledger, entry]),
        }));
      },

      spend: (amount, reason) => {
        if (!amount || !Number.isFinite(amount)) return false;
        const positive = Math.max(0, Math.round(amount));
        if (!positive) return true;
        const state = get();
        if (state.total < positive) return false;
        const ts = Date.now();
        const entry: VirtuAcornLedgerEntry = {
          id: `${ts}-spend-${Math.random().toString(36).slice(2, 8)}`,
          amount: -positive,
          reason,
          timestamp: ts,
          kind: "spend",
        };

        set((prev) => ({
          total: prev.total - positive,
          lifetimeSpent: prev.lifetimeSpent + positive,
          ledger: trimLedger([...prev.ledger, entry]),
        }));
        return true;
      },

      setTotal: (amount) => {
        if (!Number.isFinite(amount)) return;
        set({ total: Math.max(0, Math.round(amount)) });
      },

      reset: () => {
        set({
          total: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
          ledger: [],
        });
      },
    }),
    {
      name: "glidermon/virtuacorns-v1",
      version: STORAGE_VERSION,
      storage,
      partialize: (state) => ({
        total: state.total,
        lifetimeEarned: state.lifetimeEarned,
        lifetimeSpent: state.lifetimeSpent,
        ledger: state.ledger,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn("[vaStore] rehydrate error", error);
          return;
        }
        try {
          useVirtuAcornStore.setState({ _rehydrated: true });
        } catch (e) {
          console.warn("[vaStore] rehydrate flag error", e);
        }
      },
    }
  )
);
