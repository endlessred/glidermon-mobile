// ui/components/furnish/FurnishInventoryArea.tsx
//
// The single place that branches on Furnish Nest's selectedTarget.kind --
// deliberately kept separate from FurnitureInventoryPanel/
// SurfaceInventoryPanel/FurnishEmptyState themselves, so none of those three
// need to know about the other two.
import React from "react";
import { FurnishTarget, FurnishSurfaces } from "../../hooks/useFurnishSession";
import { RoomSlotDef, getSlotsForTier } from "../../../game/housing/types/roomSlots";
import FurnitureInventoryPanel from "./FurnitureInventoryPanel";
import SurfaceInventoryPanel from "./SurfaceInventoryPanel";
import FurnishEmptyState from "./FurnishEmptyState";

type Surface = "floor" | "leftWall" | "rightWall";

type Props = {
  selectedTarget: FurnishTarget | null;
  roomSizeTier: number;
  draftPlacements: Record<string, { furnitureId: string; variantId: string; paletteId?: string }>;
  onSelectFurniture: (furnitureId: string, variantId: string) => void;
  onRemoveFurniture: () => void;
  onSelectPalette: (paletteId: string) => void;
  draftSurfaces: FurnishSurfaces;
  onPreviewSurface: (surface: Surface, patternId: string) => void;
  onApplyTheme: (themeId: string) => void;
};

export default function FurnishInventoryArea({
  selectedTarget,
  roomSizeTier,
  draftPlacements,
  onSelectFurniture,
  onRemoveFurniture,
  onSelectPalette,
  draftSurfaces,
  onPreviewSurface,
  onApplyTheme,
}: Props) {
  if (selectedTarget?.kind === "slot") {
    const slot: RoomSlotDef | undefined = getSlotsForTier(roomSizeTier).find((s) => s.slotId === selectedTarget.slotId);
    if (!slot) return <FurnishEmptyState />;
    return (
      <FurnitureInventoryPanel
        selectedSlot={slot}
        draftPlacements={draftPlacements}
        onSelectFurniture={onSelectFurniture}
        onRemove={onRemoveFurniture}
        onSelectPalette={onSelectPalette}
      />
    );
  }

  if (selectedTarget?.kind === "surface") {
    return (
      <SurfaceInventoryPanel
        surface={selectedTarget.surface}
        draftSurfaces={draftSurfaces}
        onPreviewSurface={onPreviewSurface}
        onApplyTheme={onApplyTheme}
      />
    );
  }

  return <FurnishEmptyState />;
}
