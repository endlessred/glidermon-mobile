// stores/acornFxStore.ts
//
// Drives the "flying acorns" reward feedback: a burst of particles that
// travel from wherever a reward originated to the acorn balance badge.
// The actual currency transaction (progressionStore.grantAcorns /
// grantCheckInXp) always happens synchronously and independently of this —
// this store only tracks the queued visual bursts and the badge's
// temporarily-decoupled "catching up" display value.
import { create } from "zustand";
import { useProgressionStore } from "./progressionStore";

export type Point = { x: number; y: number };

export type AcornBurst = {
  id: string;
  source: Point;
  amount: number;
  particleCount: number;
  /** acorns value immediately before this reward was granted, for the count-up animation */
  baselineAcorns: number;
};

type AcornFxState = {
  queue: AcornBurst[];
  /** while a burst is animating, the badge shows this instead of the (already-updated) real value */
  displayedAcorns: number | null;
  /** live screen position of the persistent badge, if one is currently mounted (e.g. on the Home tab) */
  badgeAnchor: Point | null;
  pulseNonce: number;

  spawnAcornFx: (source: Point, amount: number) => void;
  beginCurrent: () => void;
  bumpDisplayed: (delta: number) => void;
  finishCurrent: () => void;
  registerBadgeAnchor: (point: Point) => void;
  unregisterBadgeAnchor: () => void;
  triggerPulse: () => void;
};

const particleCountFor = (amount: number) =>
  Math.max(3, Math.min(7, 3 + Math.floor(amount / 20)));

let burstSeq = 0;

export const useAcornFxStore = create<AcornFxState>((set, get) => ({
  queue: [],
  displayedAcorns: null,
  badgeAnchor: null,
  pulseNonce: 0,

  spawnAcornFx: (source, amount) => {
    if (amount <= 0) return;
    // grantAcorns/grantCheckInXp is expected to have already run by the time
    // this is called, so the pre-reward baseline is just the current value minus this amount.
    const baselineAcorns = useProgressionStore.getState().acorns - amount;
    const burst: AcornBurst = {
      id: `acornfx-${Date.now()}-${burstSeq++}`,
      source,
      amount,
      particleCount: particleCountFor(amount),
      baselineAcorns,
    };
    set((s) => ({ queue: [...s.queue, burst] }));
  },

  beginCurrent: () => {
    const cur = get().queue[0];
    if (cur) set({ displayedAcorns: cur.baselineAcorns });
  },

  bumpDisplayed: (delta) => {
    set((s) => ({ displayedAcorns: (s.displayedAcorns ?? 0) + delta }));
  },

  finishCurrent: () => {
    set((s) => ({ queue: s.queue.slice(1), displayedAcorns: null }));
  },

  registerBadgeAnchor: (point) => set({ badgeAnchor: point }),
  unregisterBadgeAnchor: () => set({ badgeAnchor: null }),

  triggerPulse: () => set((s) => ({ pulseNonce: s.pulseNonce + 1 })),
}));
