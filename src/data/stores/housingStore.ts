// stores/housingStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FloorSetName, WallSetName } from "../../game/housing/types/RoomConfig";
import { DEFAULT_FLOOR_PATTERN_ID, DEFAULT_WALL_PATTERN_ID } from "../../game/housing/types/proceduralPatternCatalog";
import {
  getNestThemeById,
  getUsableNestThemes,
  getNestThemeWallPieceById,
  getNestThemeFloorPieceById,
  nestThemeWallLeftId,
  nestThemeWallRightId,
  nestThemeFloorId,
} from "../../game/housing/types/nestThemeCatalog";
import { isPremiumEntitled } from "../../game/housing/premiumEntitlement";

// Shared "is this id allowed" gate for surface setters -- a Nest Theme piece
// id (e.g. "nestTheme:mossy_grove:floor") is gated by its theme's own
// premiumOnly/entitlement (the same check applyNestTheme already uses),
// never by unlockedFloorPatternIds/unlockedWallPatternIds -- those two
// arrays only ever hold plain proceduralPatternCatalog.ts ids, by design
// (see nestThemeCatalog.ts's id-namespace comment). A plain catalog id falls
// back to the existing unlocked-array check.
function isFloorPatternIdUsable(id: string, unlockedFloorPatternIds: string[]): boolean {
  const piece = getNestThemeFloorPieceById(id);
  if (piece) {
    const theme = getNestThemeById(piece.themeId);
    return !!theme && (!theme.premiumOnly || isPremiumEntitled());
  }
  return unlockedFloorPatternIds.includes(id);
}
function isWallPatternIdUsable(id: string, unlockedWallPatternIds: string[]): boolean {
  const piece = getNestThemeWallPieceById(id);
  if (piece) {
    const theme = getNestThemeById(piece.themeId);
    return !!theme && (!theme.premiumOnly || isPremiumEntitled());
  }
  return unlockedWallPatternIds.includes(id);
}
// If floor+left+right exactly match one usable theme's three pieces, that
// theme's id is the correct activeNestThemeId; otherwise the configuration
// is genuinely mixed and it should be null. Computed fresh rather than
// trusted from the caller, since a piecemeal edit can accidentally
// reconstruct a theme (or drift away from one) without saying so explicitly.
function matchingNestThemeId(floorPatternId: string, wallPatternIdLeft: string, wallPatternIdRight: string): string | null {
  const theme = getUsableNestThemes().find(
    (t) =>
      nestThemeFloorId(t.id) === floorPatternId &&
      nestThemeWallLeftId(t.id) === wallPatternIdLeft &&
      nestThemeWallRightId(t.id) === wallPatternIdRight
  );
  return theme?.id ?? null;
}

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

export interface GridTile {
  row: number;
  col: number;
}

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
  // Per-screen-side wall selection -- the 3D-primitive room shell's two
  // visible walls are NOT interchangeable the way `activeWallPatternId`
  // above assumed (that field renders identically on both, fine for
  // symmetric repeating/tileable patterns). An authored Nest Theme's two
  // wall images are deliberately different, so the renderer needs a
  // distinct selection per side -- see sceneBuilder3D.ts's
  // wallPatternIdLeft/wallPatternIdRight and nestThemeCatalog.ts's
  // left/right screen-wall naming. Added alongside (not replacing)
  // `activeWallPatternId`, which existing repeating-material call sites
  // (the shop, PatternSwatch) keep reading/writing unchanged --
  // `setActiveWallPattern` sets all three fields together so a plain
  // repeating wall pattern still looks identical on both walls exactly as
  // before.
  activeWallPatternIdLeft: string;
  activeWallPatternIdRight: string;
  // Which complete Nest Theme (if any) is currently equipped -- purely
  // informational bookkeeping for a future "is this whole theme equipped"
  // UI state; the renderer never reads it, only the three fields above.
  // Not cleared by setActiveFloorPattern/setActiveWallPattern today (no UI
  // surfaces it yet) -- revisit once mix-and-match equip UI exists.
  activeNestThemeId: string | null;
  unlockedFloorPatternIds: string[];
  unlockedWallPatternIds: string[];
  // Slot-based furniture for the 3D-primitive room shell (roomSlots.ts) --
  // kept separate from `furniturePlacements` above, which the `quad`/`legacy`
  // renderers still use with their freeform row/col placement. Keyed by
  // slotId; a slot with no entry renders empty until purchased.
  activeFurnitureBySlot: Record<string, { furnitureId: string; variantId: string; paletteId?: string }>;
  unlockedFurnitureIds: string[]; // `${furnitureId}_${variantId}`
  // Glidermon's current floor tile in the 3D-primitive room shell (see
  // IsometricRoomView3D.tsx's wander scheduler). Persisted so he's found
  // wherever he last wandered to rather than resetting every app launch.
  characterTile: GridTile;
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
  /** Sets just the left or right wall, independently -- unlike
   *  setActiveWallPattern (mirrors both), this is what lets a player pick a
   *  different look per side. Accepts either a plain
   *  proceduralPatternCatalog.ts id (gated by unlockedWallPatternIds) or a
   *  Nest Theme wall-piece id (gated by that theme's own entitlement).
   *  Clears activeNestThemeId to null -- see setActiveNestSurfaces below for
   *  the atomic, theme-detecting alternative Furnish Nest actually commits
   *  through. */
  setActiveWallPatternLeft: (id: string) => void;
  setActiveWallPatternRight: (id: string) => void;
  /** Equips a complete Nest Theme's left wall, right wall, and floor pieces
   *  together (see nestThemeCatalog.ts). No-ops silently if the theme id is
   *  unknown, or if it's premiumOnly and the player isn't entitled -- the
   *  renderer never does its own entitlement check, so this is the one gate. */
  applyNestTheme: (themeId: string) => void;
  /** Atomically commits a full room-shell configuration (floor + both walls)
   *  in one `set()` -- the single write Furnish Nest's Done uses, instead of
   *  three independent setter calls (one store notification/shell-rebuild
   *  instead of up to three). No-ops entirely (nothing partially applied) if
   *  any of the three ids fails its usability gate. Derives
   *  activeNestThemeId itself: set to a theme's id only if all three
   *  incoming ids exactly match that theme's three pieces, else null for a
   *  genuinely mixed configuration -- never just nulled unconditionally. */
  setActiveNestSurfaces: (surfaces: { floorPatternId: string; wallPatternIdLeft: string; wallPatternIdRight: string }) => void;
  placeFurniture: (placement: FurniturePlacement) => void;
  removeFurniture: (id: string) => void;
  unlockFurniture: (id: string) => void;
  setActiveFurniture: (slotId: string, furnitureId: string, variantId: string, paletteId?: string) => void;
  clearFurnitureSlot: (slotId: string) => void;
  setCharacterTile: (tile: GridTile) => void;
};

const DEFAULT_FLOOR_SETS: FloorSetName[] = ["YellowCarpet", "RedCarpet"];
const DEFAULT_WALL_SETS: WallSetName[] = ["Brown1WoodPaneling"];
// Matches the existing cozy4x4 room's chair placement for visual continuity.
const DEFAULT_FURNITURE: FurniturePlacement[] = [
  { id: "starter-chair", furnitureId: "chair", variantId: "wood_chair_green", row: 2, col: 2, facing: "right" },
];

// Slot-based furniture defaults: only Seating ships filled (reusing the same
// free starter chair as DEFAULT_FURNITURE above), the other 8 slots start
// empty until purchased -- same "one free default, rest purchasable"
// precedent as the floor/wall pattern catalog.
const DEFAULT_FURNITURE_BY_SLOT: Record<string, { furnitureId: string; variantId: string }> = {
  seating: { furnitureId: "chair", variantId: "wood_chair_green" },
};
const DEFAULT_UNLOCKED_FURNITURE_IDS: string[] = ["chair_wood_chair_green"];
// Matches the room's previous hardcoded spawn position (gridColumn=1, gridRow=0).
const DEFAULT_CHARACTER_TILE: GridTile = { row: 0, col: 1 };

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
      activeWallPatternIdLeft: DEFAULT_WALL_PATTERN_ID,
      activeWallPatternIdRight: DEFAULT_WALL_PATTERN_ID,
      activeNestThemeId: null,
      unlockedFloorPatternIds: [DEFAULT_FLOOR_PATTERN_ID],
      unlockedWallPatternIds: [DEFAULT_WALL_PATTERN_ID],
      activeFurnitureBySlot: DEFAULT_FURNITURE_BY_SLOT,
      unlockedFurnitureIds: DEFAULT_UNLOCKED_FURNITURE_IDS,
      characterTile: DEFAULT_CHARACTER_TILE,
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
        if (!isFloorPatternIdUsable(id, get().unlockedFloorPatternIds)) return;
        set({ activeFloorPatternId: id });
      },

      setActiveWallPattern: (id) => {
        if (!get().unlockedWallPatternIds.includes(id)) return;
        // Applies to both walls at once -- this is the existing single-pick
        // repeating-material path, which has always rendered identically on
        // both sides (see activeWallPatternIdLeft/Right's comment above).
        set({ activeWallPatternId: id, activeWallPatternIdLeft: id, activeWallPatternIdRight: id });
      },

      setActiveWallPatternLeft: (id) => {
        if (!isWallPatternIdUsable(id, get().unlockedWallPatternIds)) return;
        set({ activeWallPatternIdLeft: id, activeNestThemeId: null });
      },

      setActiveWallPatternRight: (id) => {
        if (!isWallPatternIdUsable(id, get().unlockedWallPatternIds)) return;
        set({ activeWallPatternIdRight: id, activeNestThemeId: null });
      },

      applyNestTheme: (themeId) => {
        const theme = getNestThemeById(themeId);
        if (!theme) return;
        if (theme.premiumOnly && !isPremiumEntitled()) return;
        set({
          activeWallPatternIdLeft: nestThemeWallLeftId(theme.id),
          activeWallPatternIdRight: nestThemeWallRightId(theme.id),
          activeFloorPatternId: nestThemeFloorId(theme.id),
          activeNestThemeId: theme.id,
        });
      },

      setActiveNestSurfaces: ({ floorPatternId, wallPatternIdLeft, wallPatternIdRight }) => {
        const { unlockedFloorPatternIds, unlockedWallPatternIds } = get();
        if (
          !isFloorPatternIdUsable(floorPatternId, unlockedFloorPatternIds) ||
          !isWallPatternIdUsable(wallPatternIdLeft, unlockedWallPatternIds) ||
          !isWallPatternIdUsable(wallPatternIdRight, unlockedWallPatternIds)
        ) {
          return;
        }
        set({
          activeFloorPatternId: floorPatternId,
          activeWallPatternIdLeft: wallPatternIdLeft,
          activeWallPatternIdRight: wallPatternIdRight,
          activeNestThemeId: matchingNestThemeId(floorPatternId, wallPatternIdLeft, wallPatternIdRight),
        });
      },

      placeFurniture: (placement) => {
        set((s) => ({
          furniturePlacements: [...s.furniturePlacements.filter((p) => p.id !== placement.id), placement],
        }));
      },

      removeFurniture: (id) => {
        set((s) => ({ furniturePlacements: s.furniturePlacements.filter((p) => p.id !== id) }));
      },

      unlockFurniture: (id) => {
        set((s) => (s.unlockedFurnitureIds.includes(id) ? s : { unlockedFurnitureIds: [...s.unlockedFurnitureIds, id] }));
      },

      setActiveFurniture: (slotId, furnitureId, variantId, paletteId) => {
        const id = `${furnitureId}_${variantId}`;
        if (!get().unlockedFurnitureIds.includes(id)) return;
        set((s) => ({
          activeFurnitureBySlot: { ...s.activeFurnitureBySlot, [slotId]: { furnitureId, variantId, paletteId } },
        }));
      },

      clearFurnitureSlot: (slotId) => {
        set((s) => {
          const next = { ...s.activeFurnitureBySlot };
          delete next[slotId];
          return { activeFurnitureBySlot: next };
        });
      },

      setCharacterTile: (tile) => {
        set({ characterTile: tile });
      },
    }),
    {
      name: "housing_store_v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 5,
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

        // v3: slot-based furniture for the 3D room shell, added alongside
        // (not replacing) the freeform `furniturePlacements` above.
        s.activeFurnitureBySlot = s.activeFurnitureBySlot && typeof s.activeFurnitureBySlot === "object"
          ? s.activeFurnitureBySlot
          : DEFAULT_FURNITURE_BY_SLOT;
        s.unlockedFurnitureIds = Array.isArray(s.unlockedFurnitureIds) && s.unlockedFurnitureIds.length > 0
          ? s.unlockedFurnitureIds
          : DEFAULT_UNLOCKED_FURNITURE_IDS;

        // v4: Glidermon's wandering position in the 3D room shell.
        s.characterTile = s.characterTile && typeof s.characterTile.row === "number" && typeof s.characterTile.col === "number"
          ? s.characterTile
          : DEFAULT_CHARACTER_TILE;

        // v5: per-screen-side wall selection (Premium Nest Themes) + which
        // theme (if any) is equipped, added alongside `activeWallPatternId`.
        // A pre-v5 save has no notion of asymmetric walls, so both sides
        // simply mirror the single value it already had -- zero visual
        // change for existing players.
        s.activeWallPatternIdLeft = typeof s.activeWallPatternIdLeft === "string" ? s.activeWallPatternIdLeft : s.activeWallPatternId;
        s.activeWallPatternIdRight = typeof s.activeWallPatternIdRight === "string" ? s.activeWallPatternIdRight : s.activeWallPatternId;
        s.activeNestThemeId = typeof s.activeNestThemeId === "string" ? s.activeNestThemeId : null;
        return s;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);
