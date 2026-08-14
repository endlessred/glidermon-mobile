// components/handcrafted/EquipSlotBadge.tsx
import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import StitchedBorder from "./StitchedBorder";
import { INK, CREAM, WOBBLE_RADIUS_SM, SHADOW_CARD } from "./tokens";

export type EquipSlotState = "empty" | "selected" | "equipped";

type EquipSlotBadgeProps = {
  label: string;
  state?: EquipSlotState;
  onPress?: () => void;
  children?: React.ReactNode;
  size?: number;
};

// One of the four equip-slot previews above the character (Head / Shoes /
// Outfit / Skin) -- all four share identical size, spacing, and border
// treatment, and the same three explicit states everywhere equip state
// shows: green "equipped" outline + checkmark, gold "selected" outline
// while previewing an unconfirmed pick, or a muted dashed outline when
// nothing's equipped.
export default function EquipSlotBadge({ label, state = "empty", onPress, children, size = 68 }: EquipSlotBadgeProps) {
  return (
    <Pressable onPress={onPress} style={styles.wrap} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.box, { width: size, height: size }]}>
        <View style={styles.fill} />
        <StitchedBorder variant={state === "equipped" ? "equipped" : state === "selected" ? "selected" : "dashed"} />
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
    ...SHADOW_CARD,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CREAM,
    ...WOBBLE_RADIUS_SM,
  },
  inner: {
    flex: 1,
    margin: "9%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
