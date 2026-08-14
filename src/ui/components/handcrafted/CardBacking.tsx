// components/handcrafted/CardBacking.tsx
import React from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Ellipse } from "react-native-svg";
import { FELT_GREEN } from "./tokens";

type CardBackingProps = {
  style?: StyleProp<ViewStyle>;
};

// A single, subtle backing shape reused behind every cosmetic thumbnail --
// not a different shape per item type. Just enough to separate the artwork
// from the cream card without competing with it.
export default function CardBacking({ style }: CardBackingProps) {
  return (
    <Svg style={[StyleSheet.absoluteFillObject, style]} viewBox="0 0 100 100" pointerEvents="none">
      <Ellipse cx={50} cy={54} rx={42} ry={34} fill={FELT_GREEN} opacity={0.16} />
    </Svg>
  );
}
