// ui/components/furnish/FurnitureInventoryPanel.tsx
//
// The furniture-browsing surface shown beneath the room while Furnish Nest
// is active, replacing Home's normal Check-In/Today's Goals content for the
// duration. Reuses the exact Outfit visual language (CosmeticGrid,
// CosmeticCard via FurnitureCard, CraftActionButton) rather than inventing a
// second design system.
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import CraftPanel from "../handcrafted/CraftPanel";
import CraftActionButton from "../handcrafted/CraftActionButton";
import CosmeticGrid from "../handcrafted/CosmeticGrid";
import FurnitureCard from "./FurnitureCard";
import ColorwaySheet from "../ColorwaySheet";
import { useHousingStore } from "../../../data/stores/housingStore";
import { RoomSlotDef } from "../../../game/housing/types/roomSlots";
import {
  FURNITURE_CATALOG,
  SLOT_TYPE_LABELS,
  SLOT_TYPE_ICONS,
  getFurnitureIdsForSlotType,
} from "../../../game/housing/types/furnitureCatalog";
import { INK } from "../handcrafted/tokens";

type FurnitureListItem = {
  furnitureId: string;
  variantId: string;
  name: string;
  previewAsset: string;
};

type Props = {
  /** Guaranteed non-null -- FurnishInventoryArea only renders this panel
   * when selectedTarget.kind === 'slot'; the "nothing selected" state lives
   * in FurnishEmptyState instead. */
  selectedSlot: RoomSlotDef;
  draftPlacements: Record<string, { furnitureId: string; variantId: string; paletteId?: string }>;
  onSelectFurniture: (furnitureId: string, variantId: string) => void;
  onRemove: () => void;
  onSelectPalette: (paletteId: string) => void;
};

export default function FurnitureInventoryPanel({ selectedSlot, draftPlacements, onSelectFurniture, onRemove, onSelectPalette }: Props) {
  const unlockedFurnitureIds = useHousingStore((s) => s.unlockedFurnitureIds);
  const [colorwaySheetOpen, setColorwaySheetOpen] = useState(false);

  const ownedItems = useMemo(() => {
    const furnitureIds = getFurnitureIdsForSlotType(selectedSlot.type);
    const owned: FurnitureListItem[] = [];
    for (const furnitureId of furnitureIds) {
      const def = FURNITURE_CATALOG[furnitureId];
      if (!def) continue;
      for (const variant of def.variants) {
        const ownedId = `${furnitureId}_${variant.id}`;
        if (!unlockedFurnitureIds.includes(ownedId)) continue;
        // displayName is the only player-facing name -- id/skin are internal
        // asset-pipeline identifiers (e.g. "TableLamp_On") and must never
        // reach this UI.
        owned.push({
          furnitureId,
          variantId: variant.id,
          name: variant.displayName,
          previewAsset: variant.restPoseAsset ?? variant.layers?.[0]?.assetName ?? "",
        });
      }
    }
    return owned;
  }, [selectedSlot, unlockedFurnitureIds]);

  const icon = SLOT_TYPE_ICONS[selectedSlot.type];
  const label = SLOT_TYPE_LABELS[selectedSlot.type];
  // Read from the DRAFT placement, never the original persisted one -- if
  // the player has already previewed a different item in this slot this
  // session, Remove must clear that draft item, not whatever was here
  // originally.
  const occupant = draftPlacements[selectedSlot.slotId];

  // The variant currently occupying this slot -- drives whether the
  // "Colors" action shows, same as EquipScreen's activeItemHasPalettes.
  const occupantVariant = occupant
    ? FURNITURE_CATALOG[occupant.furnitureId]?.variants.find((v) => v.id === occupant.variantId)
    : undefined;
  const occupantHasPalettes = !!occupantVariant?.recolorable && (occupantVariant.palettes?.length ?? 0) > 1;

  return (
    <CraftPanel texture="cork" stitched={false} shadow="panel" grainOpacity={0.13} style={styles.panel} contentStyle={styles.panelContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{icon} {label}</Text>
        <Text style={styles.headerSubtitle}>Choose what goes here · {ownedItems.length} owned</Text>
      </View>
      <CosmeticGrid
        items={ownedItems}
        keyExtractor={(item) => `${item.furnitureId}_${item.variantId}`}
        emptyMessage={`No ${label} furniture owned yet.`}
        renderItem={(item, index) => {
          const isPlaced = occupant?.furnitureId === item.furnitureId && occupant?.variantId === item.variantId;
          return (
            <FurnitureCard
              name={item.name}
              previewAsset={item.previewAsset}
              state={isPlaced ? "equipped" : "default"}
              rotationIndex={index}
              onPress={() => onSelectFurniture(item.furnitureId, item.variantId)}
            />
          );
        }}
      />
      {occupant && (
        <View style={styles.actionRow}>
          <CraftActionButton
            label="× Remove"
            tone="cream"
            onPress={onRemove}
            style={styles.actionButton}
            accessibilityLabel="Remove furniture from this slot"
          />
          {occupantHasPalettes && (
            <CraftActionButton
              label="🎨 Colors"
              tone="cream"
              onPress={() => setColorwaySheetOpen(true)}
              style={styles.actionButton}
              accessibilityLabel="Change this furniture's color"
            />
          )}
        </View>
      )}

      <ColorwaySheet
        visible={colorwaySheetOpen}
        item={occupantVariant ? { name: occupantVariant.displayName, palettes: occupantVariant.palettes } : undefined}
        selectedPaletteId={occupant?.paletteId}
        onSelectPalette={onSelectPalette}
        onClose={() => setColorwaySheetOpen(false)}
      />
    </CraftPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  panelContent: {
    flex: 1,
  },
  header: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: INK,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: INK,
    opacity: 0.65,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    minWidth: 140,
  },
});
