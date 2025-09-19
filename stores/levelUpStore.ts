// stores/levelUpStore.ts
import { create } from "zustand";

export type LevelUpEvent = {
  id: string;
  fromLevel: number;
  toLevel: number;
  // Optional: economy goodies to show on the card
  rewards?: {
    acorns?: number;     // e.g., 50 for each level
    items?: string[];    // future: cosmetic unlocks
  };
};

type LevelUpState = {
  queue: LevelUpEvent[];
  // read
  current: () => LevelUpEvent | null;
  hasNext: () => boolean;
  // write
  enqueue: (e: LevelUpEvent) => void;
  enqueueRange: (fromLevel: number, toLevel: number, mkRewards?: (lvl: number) => LevelUpEvent["rewards"]) => void;
  dismissCurrent: () => void;
  clearAll: () => void;
};

export const useLevelUpStore = create<LevelUpState>((set, get) => ({
  queue: [],
  current: () => {
    const q = get().queue;
    return q.length ? q[0] : null;
  },
  hasNext: () => get().queue.length > 1,
  enqueue: (e) => set((s) => ({ queue: [...s.queue, e] })),
  enqueueRange: (fromLevel, toLevel, mkRewards) => {
    if (toLevel <= fromLevel) return;
    const events: LevelUpEvent[] = [];
    for (let lv = fromLevel + 1; lv <= toLevel; lv++) {
      events.push({
        id: Math.random().toString(36).slice(2),
        fromLevel: lv - 1,
        toLevel: lv,
        rewards: mkRewards ? mkRewards(lv) : undefined,
      });
    }
    set((s) => ({ queue: [...s.queue, ...events] }));
  },
  dismissCurrent: () => set((s) => ({ queue: s.queue.slice(1) })),
  clearAll: () => set({ queue: [] }),
}));
