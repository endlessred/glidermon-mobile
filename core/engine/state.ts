export type GlucoseState = 'IN_RANGE' | 'LOW' | 'HIGH';
export type LastEvent = 'UNICORN' | 'FIRST_LOW' | 'FIRST_HIGH' | 'RECOVER' | undefined;

export type Buffs = {
  focusUntil?: number;        // ms
  correctionUntil?: number;   // ms
  safetyUntil?: number;       // ms
};

export type Inventory = {
  tokens: number;
  fragments: Record<string, number>; // e.g. {"wizard_hat": 2}
  cosmeticsOwned: Record<string, true>;
  equipped?: { sprite?: string; hat?: string; prop?: string; bg?: string };
};

export type NpcFlags = {
  vendorUnlocked?: boolean;
  healerUnlocked?: boolean;
  builderUnlocked?: boolean;
  travelersUnlocked?: boolean;
  // story progress flags (examples)
  vendor_supplyRun_done?: boolean;
  healer_trial_done?: boolean;
  builder_sky_done?: boolean;
};

export type TrailPoint = { ts: number; mgdl: number };

export type GameState = {
  points: number;
  xp: number;
  level: number;
  streak: number;
  lastBg?: number;
  lastTickMs?: number;
  glucoseState: GlucoseState;
  buffs: Buffs;
  stale: boolean;
  staleSinceMs?: number;
  trail: TrailPoint[];
  inventory: Inventory;
  npc: NpcFlags;
  today: string;       // YYYY-MM-DD for daily resets
  weekOf: string;      // ISO week id for weekly challenges
  unicornsToday: number;
  tirSamplesToday: { inRange: number; total: number };
};

export const defaultState: GameState = {
  points: 0, xp: 0, level: 1, streak: 0,
  glucoseState: 'IN_RANGE',
  buffs: {}, stale: true, trail: [],
  inventory: { tokens: 0, fragments: {}, cosmeticsOwned: {} },
  npc: {},
  today: new Date().toISOString().slice(0,10),
  weekOf: new Date().toISOString().slice(0,7) + '-W',
  unicornsToday: 0,
  tirSamplesToday: { inRange: 0, total: 0 },
};

// Simple (de)serialization helpers
export function serialize(g: GameState){ return JSON.stringify(g); }
export function deserialize(s: string): GameState { return { ...defaultState, ...JSON.parse(s) }; }
