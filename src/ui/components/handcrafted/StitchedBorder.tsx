// components/handcrafted/StitchedBorder.tsx
import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import CheckBadge from "./CheckBadge";
import { INK, INK_MUTED, GOLD, FELT_GREEN_DARK, WOBBLE_RADIUS_SM } from "./tokens";

export type BorderVariant = "ink" | "dashed" | "yarn" | "equipped" | "selected";

type StitchedBorderProps = {
  variant?: BorderVariant;
  style?: StyleProp<ViewStyle>;
};

// Absolute-fill decorative border overlay -- place inside a relatively
// positioned parent alongside its real content. Uses native borders (not a
// stretched SVG path) so it never warps regardless of the parent's aspect
// ratio.
//
// "equipped" (green) means this is the thing currently worn -- used
// consistently everywhere equip state shows, both the grid and the corner
// slot badges. "selected" (gold) is a distinct, momentary pick state, kept
// visually separate from "equipped" so a checkmark never means two things.
export default function StitchedBorder({ variant = "ink", style }: StitchedBorderProps) {
  const isDashed = variant === "dashed";
  const isEquipped = variant === "equipped";
  const isSelected = variant === "selected";
  const isYarn = variant === "yarn";

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.base,
        isDashed && styles.dashed,
        isYarn && styles.yarn,
        isSelected && styles.selected,
        isEquipped && styles.equipped,
        style,
      ]}
      pointerEvents="none"
    >
      {isEquipped && <CheckBadge size={18} style={styles.badge} />}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: INK,
    ...WOBBLE_RADIUS_SM,
  },
  dashed: {
    borderWidth: 2,
    borderColor: INK_MUTED,
    borderStyle: "dashed",
  },
  yarn: {
    borderWidth: 4,
    borderColor: INK,
  },
  selected: {
    borderWidth: 3,
    borderColor: GOLD,
  },
  equipped: {
    borderWidth: 3,
    borderColor: FELT_GREEN_DARK,
  },
  badge: {
    position: "absolute",
    bottom: -7,
    right: -7,
  },
});
