// stores/levelUpStore.ts
import { create } from "zustand";

export type CutsceneFrame = {
  id: string;
  backgroundImage?: string; // placeholder for now
  characterPortrait?: string; // placeholder for now
  speakerName?: string;
  dialogText: string;
};

export type UnlockData = {
  type: 'feature' | 'item' | 'area' | 'ability';
  name: string;
  description: string;
  icon?: string; // placeholder for now
};

export type LevelUpEvent = {
  id: string;
  fromLevel: number;
  toLevel: number;
  // Optional: economy goodies to show on the card
  rewards?: {
    acorns?: number;     // e.g., 50 for each level
    items?: string[];    // future: cosmetic unlocks
  };
  // New: unlock information
  unlock?: UnlockData;
  // New: cutscene data
  cutscene?: {
    frames: CutsceneFrame[];
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
  // Helper for testing the new system
  enqueueTestLevelUp: (level: number) => void;
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
  // Helper for testing the new system
  enqueueTestLevelUp: (level: number) => {
    const testEvent: LevelUpEvent = {
      id: Math.random().toString(36).slice(2),
      fromLevel: level - 1,
      toLevel: level,
      rewards: {
        acorns: level * 50,
        items: [`Level ${level} Badge`],
      },
      unlock: {
        type: 'feature',
        name: `Epic ${level === 5 ? 'Magic Ability' : 'New Feature'}`,
        description: `You've unlocked something amazing at level ${level}! This opens up new possibilities for your adventure.`,
        icon: level === 5 ? '🔮' : '⚡',
      },
      cutscene: {
        frames: [
          {
            id: 'frame1',
            speakerName: 'Mentor',
            dialogText: `Congratulations! You've reached level ${level}. Your journey grows stronger.`,
            backgroundImage: '[Forest Background]',
            characterPortrait: '🧙‍♂️',
          },
          {
            id: 'frame2',
            speakerName: 'Mentor',
            dialogText: 'With this new power, you can face greater challenges ahead.',
            backgroundImage: '[Forest Background]',
            characterPortrait: '🧙‍♂️',
          },
          {
            id: 'frame3',
            speakerName: 'Hero',
            dialogText: 'I feel the energy coursing through me. Thank you for your guidance!',
            backgroundImage: '[Forest Background]',
            characterPortrait: '🦸‍♀️',
          },
        ],
      },
    };

    set((s) => ({ queue: [...s.queue, testEvent] }));
  },
}));
