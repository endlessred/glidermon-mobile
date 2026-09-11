// ui/components/furnish/SurfaceStyleCard.tsx
//
// A 2-column-grid card for a room-surface style (an individual floor/wall
// pattern, or a whole Nest Theme) -- deliberately NOT the tiny 3-column
// furniture card: wall/floor textures need a much larger preview region to
// read as a material rather than a colored square. Reuses CraftPanel (cream
// fill + ink border + grain, same primitive as everywhere else) and the same
// green-badge language CosmeticCard/FurnitureCard already use for
// placed/equipped state.
import React from "react";
import { Pressable, View, Text, Image, StyleSheet } from "react-native";
import CraftPanel from "../handcrafted/CraftPanel";
import CheckBadge from "../handcrafted/CheckBadge";
import PatternSwatch from "../PatternSwatch";
import { SurfaceStyleItem } from "../../../game/housing/types/surfaceStyleCatalog";
import { INK, FELT_GREEN } from "../handcrafted/tokens";

type Props = {
  name: string;
  preview: SurfaceStyleItem["preview"];
  placed: boolean;
  /** "PLACED" for an individual surface pick, "APPLIED" for a whole theme --
   * furniture/surfaces are placed/applied, never "equipped". */
  badgeLabel: "PLACED" | "APPLIED";
  onPress: () => void;
};

export default function SurfaceStyleCard({ name, preview, placed, badgeLabel, onPress }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: placed }} style={styles.pressable}>
      <CraftPanel
        texture="paper"
        stitched
        shadow={placed ? "card" : "none"}
        inset={8}
        style={[styles.card, placed && styles.cardPlaced]}
        contentStyle={styles.content}
      >
        <View style={styles.previewRegion}>
          {preview.kind === "pattern" ? (
            <PatternSwatch item={preview.pattern} size={PREVIEW_SIZE} />
          ) : (
            <Image source={preview.source} resizeMode="cover" style={styles.previewImage} />
          )}
        </View>
        <Text numberOfLines={2} style={styles.name}>
          {name}
        </Text>
      </CraftPanel>
      {placed && (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{badgeLabel}</Text>
        </View>
      )}
      {placed && <CheckBadge size={18} style={styles.badge} />}
    </Pressable>
  );
}

const PREVIEW_SIZE = 132;

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    position: "relative",
  },
  card: {
    borderColor: INK,
  },
  cardPlaced: {
    borderColor: FELT_GREEN,
  },
  content: {
    alignItems: "center",
    gap: 6,
  },
  previewRegion: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFDF7",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: INK,
    textAlign: "center",
  },
  tag: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: FELT_GREEN,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFDF7",
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    zIndex: 2,
  },
});
