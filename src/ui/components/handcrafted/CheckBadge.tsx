// components/handcrafted/CheckBadge.tsx
import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { INK, FELT_GREEN, CREAM_LIGHT } from "./tokens";

type CheckBadgeProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

// Small fixed-size "equipped" checkmark badge. Deliberately never stretched
// to a parent's aspect ratio (unlike the old baked-in SVG corner badge,
// which warped into an oval on tall/wide cards) -- it just sits at a corner
// via `style`.
export default function CheckBadge({ size = 20, style }: CheckBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.check, { fontSize: size * 0.6 }]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: FELT_GREEN,
    borderWidth: 2,
    borderColor: INK,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    color: CREAM_LIGHT,
    fontWeight: "800",
    lineHeight: undefined,
  },
});
