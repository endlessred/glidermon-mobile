// components/handcrafted/EquipSlotBadge.tsx
import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import StitchedBorder from "./StitchedBorder";
import { INK, CREAM, WOBBLE_RADIUS_SM } from "./tokens";

type EquipSlotBadgeProps = {
  label: string;
  filled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  size?: number;
};

// One of the small equip-slot previews above the character (Head / Face /
// Clothes / Skin). Filled slots get a gold "equipped" outline + checkmark
// badge; empty slots get a muted dashed outline.
export default function EquipSlotBadge({ label, filled, onPress, children, size = 68 }: EquipSlotBadgeProps) {
  return (
    <Pressable onPress={onPress} style={styles.wrap} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.label} numberOfLines={1}>
        🌿 {label}
      </Text>
      <View style={[styles.box, { width: size, height: size }]}>
        <View style={styles.fill} />
        <StitchedBorder variant={filled ? "equipped" : "dashed"} />
        <View style={styles.inner}>{children}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: INK,
  },
  box: {
    position: "relative",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CREAM,
    ...WOBBLE_RADIUS_SM,
  },
  inner: {
    flex: 1,
    margin: "16%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
