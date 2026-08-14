// components/handcrafted/StitchedBorder.tsx
import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import CheckBadge from "./CheckBadge";
import { INK, INK_MUTED, GOLD, WOBBLE_RADIUS_SM } from "./tokens";

export type BorderVariant = "ink" | "dashed" | "yarn" | "equipped";

type StitchedBorderProps = {
  variant?: BorderVariant;
  style?: StyleProp<ViewStyle>;
};

// Absolute-fill decorative border overlay -- place inside a relatively
// positioned parent alongside its real content. Uses native borders (not a
// stretched SVG path) so it never warps regardless of the parent's aspect
// ratio.
export default function StitchedBorder({ variant = "ink", style }: StitchedBorderProps) {
  const isDashed = variant === "dashed";
  const isEquipped = variant === "equipped";
  const isYarn = variant === "yarn";

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.base,
        isDashed && styles.dashed,
        isYarn && styles.yarn,
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
  equipped: {
    borderWidth: 3,
    borderColor: GOLD,
  },
  badge: {
    position: "absolute",
    bottom: -7,
    right: -7,
  },
});
