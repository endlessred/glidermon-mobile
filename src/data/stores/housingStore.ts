// stores/housingStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FloorSetName, WallSetName } from "../../game/housing/types/RoomConfig";

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
  _hasHydrated: boolean;

  unlockRoomTier: (tier: number) => void;
  unlockFloorSet: (set: FloorSetName) => void;
  unlockWallSet: (set: WallSetName) => void;
  setActiveFloor: (set: FloorSetName) => void;
  setActiveWall: (set: WallSetName) => void;
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
      version: 1,
      migrate: (persisted: any, fromVersion: number) => {
        const s = persisted ?? {};
        s.roomSizeTier = typeof s.roomSizeTier === "number" ? s.roomSizeTier : 1;
        s.unlockedFloorSets = Array.isArray(s.unlockedFloorSets) && s.unlockedFloorSets.length > 0 ? s.unlockedFloorSets : DEFAULT_FLOOR_SETS;
        s.unlockedWallSets = Array.isArray(s.unlockedWallSets) && s.unlockedWallSets.length > 0 ? s.unlockedWallSets : DEFAULT_WALL_SETS;
        s.activeFloorSet = s.unlockedFloorSets.includes(s.activeFloorSet) ? s.activeFloorSet : s.unlockedFloorSets[0];
        s.activeWallSet = s.unlockedWallSets.includes(s.activeWallSet) ? s.activeWallSet : s.unlockedWallSets[0];
        s.furniturePlacements = Array.isArray(s.furniturePlacements) ? s.furniturePlacements : DEFAULT_FURNITURE;
        return s;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);
