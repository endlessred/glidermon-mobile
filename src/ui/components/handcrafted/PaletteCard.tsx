// components/handcrafted/PaletteCard.tsx
import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import PaletteSwatch from "./PaletteSwatch";
import CheckBadge from "./CheckBadge";
import type { PaletteEffect } from "../../../data/cosmetics/palette";
import {
  INK,
  INK_MUTED,
  CREAM,
  FELT_GREEN_DARK,
  PALE_GREEN,
  GOLD,
  SHADOW_CARD,
  SHADOW_CARD_RAISED,
  WOBBLE_RADIUS_SM,
} from "./tokens";

type PaletteCardProps = {
  name: string;
  /** 2-4 swatch colors representing the palette's composition. */
  colors: string[];
  selected?: boolean;
  /** A Plus-tier palette the user hasn't unlocked -- dims the card, blocks
   * selection, and shows a small "PLUS" ribbon instead of the check badge. */
  locked?: boolean;
  /** Gradient palettes render one blended swatch instead of flat dots;
   * shimmer palettes get a small sparkle accent next to their name. */
  effect?: PaletteEffect;
  onPress?: () => void;
};

// One premade colorway option inside a ColorwaySheet grid: name + its
// swatches, with the same material state language used everywhere else in
// the handcrafted kit -- cream cardstock idle, green felt outline + check
// when selected (never digital blue).
export default function PaletteCard({ name, colors, selected, locked, effect, onPress }: PaletteCardProps) {
  const isGradient = effect?.kind === "gradient";
  const isShimmer = effect?.kind === "shimmer";

  return (
    <Pressable
      // Locked is a visual/business-rule state, not a disabled control --
      // the card stays pressable so the caller can react to a tap on a
      // locked palette (e.g. an upsell prompt). Only the caller decides
      // what a locked tap does; this component just reports the tap.
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!locked }}
      style={[
        styles.card,
        WOBBLE_RADIUS_SM,
        selected ? styles.selected : styles.idle,
        selected ? SHADOW_CARD_RAISED : SHADOW_CARD,
        locked && styles.lockedOpacity,
      ]}
    >
      {isGradient ? (
        <PaletteSwatch
          colors={[colors[0] ?? INK_MUTED]}
          gradientTo={[colors[1] ?? colors[0] ?? INK_MUTED]}
          size={22}
          max={1}
          chrome={false}
        />
      ) : (
        <PaletteSwatch colors={colors} size={10} max={4} chrome={false} />
      )}
      <Text numberOfLines={1} style={[styles.name, selected && styles.nameSelected, locked && styles.nameLocked]}>
        {name}
        {isShimmer ? " ✨" : ""}
      </Text>
      {selected && !locked && <CheckBadge size={16} style={styles.check} />}
      {locked && (
        <View style={styles.plusRibbon}>
          <Text style={styles.plusRibbonText}>PLUS</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "31%",
    aspectRatio: 1.1,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  idle: {
    backgroundColor: CREAM,
    borderColor: INK_MUTED,
  },
  selected: {
    backgroundColor: PALE_GREEN,
    borderColor: FELT_GREEN_DARK,
    borderWidth: 3,
  },
  lockedOpacity: {
    opacity: 0.6,
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: INK,
    textAlign: "center",
  },
  nameSelected: {
    color: FELT_GREEN_DARK,
  },
  nameLocked: {
    color: INK_MUTED,
  },
  check: {
    position: "absolute",
    top: -7,
    right: -7,
  },
  plusRibbon: {
    position: "absolute",
    top: -7,
    right: -7,
    backgroundColor: GOLD,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plusRibbonText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#3D2E0F",
    letterSpacing: 0.3,
  },
});
