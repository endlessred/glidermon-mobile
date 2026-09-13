// ui/components/furnish/SurfaceInventoryPanel.tsx
//
// The room-style browsing surface shown beneath the room while a Furnish
// Nest surface target (floor/leftWall/rightWall) is selected -- one
// component reused for all three, not three separate panels. Same CraftPanel
// shell and two-line header pattern FurnitureInventoryPanel already
// established. Body is a plain wrapping 2-column grid inside one ScrollView
// (not CosmeticGrid/FlatList) -- item counts here are small (a handful of
// themes, a handful of owned patterns), and this panel needs two separate
// 2-column sections stacked, which would mean nesting two FlatLists inside a
// ScrollView (an RN anti-pattern) if CosmeticGrid were reused twice.
import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import CraftPanel from "../handcrafted/CraftPanel";
import SurfaceStyleCard from "./SurfaceStyleCard";
import { useHousingStore } from "../../../data/stores/housingStore";
import { getUsableNestThemes, nestThemeFloorId, nestThemeWallLeftId, nestThemeWallRightId } from "../../../game/housing/types/nestThemeCatalog";
import { getIndividualFloorStyles, getIndividualWallStyles } from "../../../game/housing/types/surfaceStyleCatalog";
import { FurnishSurfaces } from "../../hooks/useFurnishSession";
import { INK } from "../handcrafted/tokens";

type Surface = "floor" | "leftWall" | "rightWall";

type Props = {
  surface: Surface;
  draftSurfaces: FurnishSurfaces;
  onPreviewSurface: (surface: Surface, patternId: string) => void;
  onApplyTheme: (themeId: string) => void;
};

// Matches ShopItemThumbnail.tsx's category fallback emoji for visual
// consistency with Shop.
const SURFACE_ICON: Record<Surface, string> = { floor: "🟫", leftWall: "🧱", rightWall: "🧱" };
const SURFACE_LABEL: Record<Surface, string> = { floor: "Floor", leftWall: "Left Wall", rightWall: "Right Wall" };

export default function SurfaceInventoryPanel({ surface, draftSurfaces, onPreviewSurface, onApplyTheme }: Props) {
  const unlockedFloorPatternIds = useHousingStore((s) => s.unlockedFloorPatternIds);
  const unlockedWallPatternIds = useHousingStore((s) => s.unlockedWallPatternIds);

  const themes = useMemo(() => getUsableNestThemes(), []);
  const individualItems = useMemo(() => {
    if (surface === "floor") return getIndividualFloorStyles(unlockedFloorPatternIds);
    return getIndividualWallStyles(surface === "leftWall" ? "left" : "right", unlockedWallPatternIds);
  }, [surface, unlockedFloorPatternIds, unlockedWallPatternIds]);

  const icon = SURFACE_ICON[surface];
  const label = SURFACE_LABEL[surface];
  const kindWord = surface === "floor" ? "floor" : "wall";
  const currentValue = draftSurfaces[surface];

  return (
    <CraftPanel texture="cork" stitched={false} shadow="panel" grainOpacity={0.13} style={styles.panel} contentStyle={styles.panelContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {icon} {label}
        </Text>
        <Text style={styles.headerSubtitle}>
          Choose a {kindWord} style · {individualItems.length} owned
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {themes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Nest Themes</Text>
            <View style={styles.grid}>
              {themes.map((theme) => {
                const applied =
                  draftSurfaces.floor === nestThemeFloorId(theme.id) &&
                  draftSurfaces.leftWall === nestThemeWallLeftId(theme.id) &&
                  draftSurfaces.rightWall === nestThemeWallRightId(theme.id);
                return (
                  <View key={theme.id} style={styles.cell}>
                    <SurfaceStyleCard
                      name={theme.name}
                      preview={{ kind: "image", source: theme.floor.texture }}
                      placed={applied}
                      badgeLabel="APPLIED"
                      onPress={() => onApplyTheme(theme.id)}
                    />
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>{surface === "floor" ? "Floor Styles" : "Wall Styles"}</Text>
        {individualItems.length === 0 ? (
          <CraftPanel texture="paper" stitched={false} style={styles.emptyPanel} contentStyle={styles.emptyPanelContent}>
            <Text style={styles.emptyText}>No {label} styles owned yet.</Text>
          </CraftPanel>
        ) : (
          <View style={styles.grid}>
            {individualItems.map((item) => (
              <View key={item.id} style={styles.cell}>
                <SurfaceStyleCard
                  name={item.displayName}
                  preview={item.preview}
                  placed={item.id === currentValue}
                  badgeLabel="PLACED"
                  onPress={() => onPreviewSurface(surface, item.id)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 20,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: INK,
    opacity: 0.75,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  cell: {
    width: "47%",
  },
  emptyPanel: {
    minHeight: 60,
    justifyContent: "center",
  },
  emptyPanelContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    color: INK,
    textAlign: "center",
    fontStyle: "italic",
  },
});
