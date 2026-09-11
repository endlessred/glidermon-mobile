// ui/hooks/useFurnishSession.ts
//
// Local controller for the Furnish Nest editing session: a draft copy of
// housingStore's activeFurnitureBySlot AND the room shell's floor/wall
// surfaces, both previewed live by the 3D room, and only ever written back
// to the real store on an explicit Done. Deliberately NOT a persisted store
// -- the draft must never survive a relaunch, and this is ephemeral
// UI-session state, not durable game state.
import { useCallback, useMemo, useRef, useState } from "react";
import { useHousingStore } from "../../data/stores/housingStore";
import { getUsableNestThemes, nestThemeFloorId, nestThemeWallLeftId, nestThemeWallRightId } from "../../game/housing/types/nestThemeCatalog";

export type FurniturePlacementMap = Record<string, { furnitureId: string; variantId: string; paletteId?: string }>;

export type FurnishTarget =
  | { kind: "slot"; slotId: string }
  | { kind: "surface"; surface: "floor" | "leftWall" | "rightWall" };

export interface FurnishSurfaces {
  floor: string;
  leftWall: string;
  rightWall: string;
}

export interface FurnishSession {
  active: boolean;
  selectedTarget: FurnishTarget | null;
  /** Derived from selectedTarget -- never independently settable, so a slot
   * and a surface can never both read as "selected" at once. */
  selectedSlotId: string | null;
  selectedSurface: "floor" | "leftWall" | "rightWall" | null;
  draftPlacements: FurniturePlacementMap;
  draftSurfaces: FurnishSurfaces;
  dirty: boolean;
  enter: () => void;
  selectTarget: (target: FurnishTarget) => void;
  placeFurniture: (furnitureId: string, variantId: string) => void;
  removeFurniture: () => void;
  /** Sets the colorway for whatever is currently placed in the selected slot
   * -- no-op if the slot isn't selected or is empty. Mirrors Outfit's
   * setCosmeticPalette, but scoped to the draft session (only committed to
   * housingStore on Done, same as placeFurniture/removeFurniture). */
  setPalette: (paletteId: string) => void;
  placeSurface: (surface: "floor" | "leftWall" | "rightWall", patternId: string) => void;
  applyThemeDraft: (themeId: string) => void;
  commit: () => void;
  discard: () => void;
}

function arePlacementsEqual(a: FurniturePlacementMap, b: FurniturePlacementMap): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const av = a[key];
    const bv = b[key];
    if (!bv || av.furnitureId !== bv.furnitureId || av.variantId !== bv.variantId || av.paletteId !== bv.paletteId) return false;
  }
  return true;
}

function readSurfacesFromStore(): FurnishSurfaces {
  const s = useHousingStore.getState();
  return { floor: s.activeFloorPatternId, leftWall: s.activeWallPatternIdLeft, rightWall: s.activeWallPatternIdRight };
}

export function useFurnishSession(): FurnishSession {
  const [active, setActive] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<FurnishTarget | null>(null);
  const [draftPlacements, setDraftPlacements] = useState<FurniturePlacementMap>({});
  const [draftSurfaces, setDraftSurfaces] = useState<FurnishSurfaces>({ floor: "", leftWall: "", rightWall: "" });
  const originalPlacementsRef = useRef<FurniturePlacementMap>({});
  const originalSurfacesRef = useRef<FurnishSurfaces>({ floor: "", leftWall: "", rightWall: "" });

  const selectedSlotId = selectedTarget?.kind === "slot" ? selectedTarget.slotId : null;
  const selectedSurface = selectedTarget?.kind === "surface" ? selectedTarget.surface : null;

  const enter = useCallback(() => {
    const currentPlacements = useHousingStore.getState().activeFurnitureBySlot;
    const currentSurfaces = readSurfacesFromStore();
    originalPlacementsRef.current = currentPlacements;
    originalSurfacesRef.current = currentSurfaces;
    setDraftPlacements(currentPlacements);
    setDraftSurfaces(currentSurfaces);
    setSelectedTarget(null);
    setActive(true);
  }, []);

  const selectTarget = useCallback((target: FurnishTarget) => {
    setSelectedTarget(target);
  }, []);

  const placeFurniture = useCallback(
    (furnitureId: string, variantId: string) => {
      setDraftPlacements((prev) => {
        if (!selectedSlotId) return prev;
        return { ...prev, [selectedSlotId]: { furnitureId, variantId } };
      });
    },
    [selectedSlotId]
  );

  const removeFurniture = useCallback(() => {
    setDraftPlacements((prev) => {
      if (!selectedSlotId || !prev[selectedSlotId]) return prev;
      const next = { ...prev };
      delete next[selectedSlotId];
      return next;
    });
  }, [selectedSlotId]);

  const setPalette = useCallback(
    (paletteId: string) => {
      setDraftPlacements((prev) => {
        if (!selectedSlotId || !prev[selectedSlotId]) return prev;
        return { ...prev, [selectedSlotId]: { ...prev[selectedSlotId], paletteId } };
      });
    },
    [selectedSlotId]
  );

  const placeSurface = useCallback((surface: "floor" | "leftWall" | "rightWall", patternId: string) => {
    setDraftSurfaces((prev) => ({ ...prev, [surface]: patternId }));
  }, []);

  const applyThemeDraft = useCallback((themeId: string) => {
    const theme = getUsableNestThemes().find((t) => t.id === themeId);
    if (!theme) return; // unknown or locked -- same gate applyNestTheme uses
    setDraftSurfaces({
      floor: nestThemeFloorId(theme.id),
      leftWall: nestThemeWallLeftId(theme.id),
      rightWall: nestThemeWallRightId(theme.id),
    });
  }, []);

  const resetSession = useCallback(() => {
    setActive(false);
    setSelectedTarget(null);
    setDraftPlacements({});
    setDraftSurfaces({ floor: "", leftWall: "", rightWall: "" });
    originalPlacementsRef.current = {};
    originalSurfacesRef.current = { floor: "", leftWall: "", rightWall: "" };
  }, []);

  const commit = useCallback(() => {
    const original = originalPlacementsRef.current;
    const draft = draftPlacements;
    const { setActiveFurniture, clearFurnitureSlot, setActiveNestSurfaces } = useHousingStore.getState();
    const slotIds = new Set([...Object.keys(original), ...Object.keys(draft)]);
    for (const slotId of slotIds) {
      const before = original[slotId];
      const after = draft[slotId];
      const changed =
        (!before && after) ||
        (before && !after) ||
        (before && after && (before.furnitureId !== after.furnitureId || before.variantId !== after.variantId || before.paletteId !== after.paletteId));
      if (!changed) continue;
      if (after) setActiveFurniture(slotId, after.furnitureId, after.variantId, after.paletteId);
      else clearFurnitureSlot(slotId);
    }

    const originalSurfaces = originalSurfacesRef.current;
    if (
      draftSurfaces.floor !== originalSurfaces.floor ||
      draftSurfaces.leftWall !== originalSurfaces.leftWall ||
      draftSurfaces.rightWall !== originalSurfaces.rightWall
    ) {
      // One atomic write (see housingStore.ts's setActiveNestSurfaces) --
      // avoids up to three separate store notifications/shell rebuilds for
      // a single Done.
      setActiveNestSurfaces({
        floorPatternId: draftSurfaces.floor,
        wallPatternIdLeft: draftSurfaces.leftWall,
        wallPatternIdRight: draftSurfaces.rightWall,
      });
    }

    resetSession();
  }, [draftPlacements, draftSurfaces, resetSession]);

  const discard = useCallback(() => {
    resetSession();
  }, [resetSession]);

  const dirty = useMemo(() => {
    const original = originalSurfacesRef.current;
    return (
      !arePlacementsEqual(draftPlacements, originalPlacementsRef.current) ||
      draftSurfaces.floor !== original.floor ||
      draftSurfaces.leftWall !== original.leftWall ||
      draftSurfaces.rightWall !== original.rightWall
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPlacements, draftSurfaces]);

  return {
    active,
    selectedTarget,
    selectedSlotId,
    selectedSurface,
    draftPlacements,
    draftSurfaces,
    dirty,
    enter,
    selectTarget,
    placeFurniture,
    removeFurniture,
    setPalette,
    placeSurface,
    applyThemeDraft,
    commit,
    discard,
  };
}
