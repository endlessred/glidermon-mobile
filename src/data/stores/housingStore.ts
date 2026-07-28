// stores/housingStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FloorSetName, WallSetName } from "../../game/housing/types/RoomConfig";
import { DEFAULT_FLOOR_PATTERN_ID, DEFAULT_WALL_PATTERN_ID } from "../../game/housing/types/proceduralPatternCatalog";

export interface RoomSizeTier {
  width: number;
  height: number;
}

// Room-size progression tiers. Unlocking further tiers (and the acorn/streak
// thresholds to do so) is a follow-up phase once those numbers are decided.
export const ROOM_SIZE_TIERS: RoomSizeTier[] = [
  { width: 3, height: 3 },
  { width: 4, height: 4 },
  { width: 5, height: 5 },
];

export interface FurniturePlacement {
  id: string;
  furnitureId: string;
  variantId: string;
  row: number;
  col: number;
  rotation?: number;
  facing?: "left" | "right";
  layer?: "under" | "mid" | "over";
}

type HousingState = {
  roomSizeTier: number;
  unlockedFloorSets: FloorSetName[];
  unlockedWallSets: WallSetName[];
  activeFloorSet: FloorSetName;
  activeWallSet: WallSetName;
  furniturePlacements: FurniturePlacement[];
  // Procedural pattern catalog (proceduralPatternCatalog.ts) for the
  // 3D-primitive room shell -- kept separate from the asset-backed fields
  // above, which the `quad`/`legacy` renderers still use. See the housing
  // plan for why these two systems are deliberately not unified.
  activeFloorPatternId: string;
  activeWallPatternId: string;
  unlockedFloorPatternIds: string[];
  unlockedWallPatternIds: string[];
  _hasHydrated: boolean;

  unlockRoomTier: (tier: number) => void;
  unlockFloorSet: (set: FloorSetName) => void;
  unlockWallSet: (set: WallSetName) => void;
  setActiveFloor: (set: FloorSetName) => void;
  setActiveWall: (set: WallSetName) => void;
  unlockFloorPattern: (id: string) => void;
  unlockWallPattern: (id: string) => void;
  setActiveFloorPattern: (id: string) => void;
  setActiveWallPattern: (id: string) => void;
  placeFurniture: (placement: FurniturePlacement) => void;
  removeFurniture: (id: string) => void;
};

const DEFAULT_FLOOR_SETS: FloorSetName[] = ["YellowCarpet", "RedCarpet"];
const DEFAULT_WALL_SETS: WallSetName[] = ["Brown1WoodPaneling"];
// Matches the existing cozy4x4 room's chair placement for visual continuity.
const DEFAULT_FURNITURE: FurniturePlacement[] = [
  { id: "starter-chair", furnitureId: "chair", variantId: "wood_chair_green", row: 2, col: 2, facing: "right" },
];

export const useHousingStore = create<HousingState>()(
  persist(
    (set, get) => ({
      roomSizeTier: 1,
      unlockedFloorSets: DEFAULT_FLOOR_SETS,
      unlockedWallSets: DEFAULT_WALL_SETS,
      activeFloorSet: "YellowCarpet",
      activeWallSet: "Brown1WoodPaneling",
      furniturePlacements: DEFAULT_FURNITURE,
      activeFloorPatternId: DEFAULT_FLOOR_PATTERN_ID,
      activeWallPatternId: DEFAULT_WALL_PATTERN_ID,
      unlockedFloorPatternIds: [DEFAULT_FLOOR_PATTERN_ID],
      unlockedWallPatternIds: [DEFAULT_WALL_PATTERN_ID],
      _hasHydrated: false,

      unlockRoomTier: (tier) => {
        if (tier < 0 || tier >= ROOM_SIZE_TIERS.length) return;
        set((s) => ({ roomSizeTier: Math.max(s.roomSizeTier, tier) }));
      },

      unlockFloorSet: (setName) => {
        set((s) => (s.unlockedFloorSets.includes(setName) ? s : { unlockedFloorSets: [...s.unlockedFloorSets, setName] }));
      },

      unlockWallSet: (setName) => {
        set((s) => (s.unlockedWallSets.includes(setName) ? s : { unlockedWallSets: [...s.unlockedWallSets, setName] }));
      },

      setActiveFloor: (setName) => {
        if (!get().unlockedFloorSets.includes(setName)) return;
        set({ activeFloorSet: setName });
      },

      setActiveWall: (setName) => {
        if (!get().unlockedWallSets.includes(setName)) return;
        set({ activeWallSet: setName });
      },

      unlockFloorPattern: (id) => {
        set((s) => (s.unlockedFloorPatternIds.includes(id) ? s : { unlockedFloorPatternIds: [...s.unlockedFloorPatternIds, id] }));
      },

      unlockWallPattern: (id) => {
        set((s) => (s.unlockedWallPatternIds.includes(id) ? s : { unlockedWallPatternIds: [...s.unlockedWallPatternIds, id] }));
      },

      setActiveFloorPattern: (id) => {
        if (!get().unlockedFloorPatternIds.includes(id)) return;
        set({ activeFloorPatternId: id });
      },

      setActiveWallPattern: (id) => {
        if (!get().unlockedWallPatternIds.includes(id)) return;
        set({ activeWallPatternId: id });
      },

      placeFurniture: (placement) => {
        set((s) => ({
          furniturePlacements: [...s.furniturePlacements.filter((p) => p.id !== placement.id), placement],
        }));
      },

      removeFurniture: (id) => {
        set((s) => ({ furniturePlacements: s.furniturePlacements.filter((p) => p.id !== id) }));
      },
    }),
    {
      name: "housing_store_v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: any, fromVersion: number) => {
        const s = persisted ?? {};
        s.roomSizeTier = typeof s.roomSizeTier === "number" ? s.roomSizeTier : 1;
        s.unlockedFloorSets = Array.isArray(s.unlockedFloorSets) && s.unlockedFloorSets.length > 0 ? s.unlockedFloorSets : DEFAULT_FLOOR_SETS;
        s.unlockedWallSets = Array.isArray(s.unlockedWallSets) && s.unlockedWallSets.length > 0 ? s.unlockedWallSets : DEFAULT_WALL_SETS;
        s.activeFloorSet = s.unlockedFloorSets.includes(s.activeFloorSet) ? s.activeFloorSet : s.unlockedFloorSets[0];
        s.activeWallSet = s.unlockedWallSets.includes(s.activeWallSet) ? s.activeWallSet : s.unlockedWallSets[0];
        s.furniturePlacements = Array.isArray(s.furniturePlacements) ? s.furniturePlacements : DEFAULT_FURNITURE;

        // v2: procedural pattern catalog for the 3D room shell, added
        // alongside (not replacing) the asset-backed fields above.
        s.unlockedFloorPatternIds = Array.isArray(s.unlockedFloorPatternIds) && s.unlockedFloorPatternIds.length > 0
          ? s.unlockedFloorPatternIds
          : [DEFAULT_FLOOR_PATTERN_ID];
        s.unlockedWallPatternIds = Array.isArray(s.unlockedWallPatternIds) && s.unlockedWallPatternIds.length > 0
          ? s.unlockedWallPatternIds
          : [DEFAULT_WALL_PATTERN_ID];
        s.activeFloorPatternId = s.unlockedFloorPatternIds.includes(s.activeFloorPatternId)
          ? s.activeFloorPatternId
          : s.unlockedFloorPatternIds[0];
        s.activeWallPatternId = s.unlockedWallPatternIds.includes(s.activeWallPatternId)
          ? s.activeWallPatternId
          : s.unlockedWallPatternIds[0];
        return s;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);
