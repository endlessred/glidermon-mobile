// components/handcrafted/CraftBottomNav.tsx
import React, { useState } from "react";
import { View, Image, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { CREAM, INK } from "./tokens";

const constructionPaper = require("../../../assets/UI Assets/Textures/ConstructionPaper.png");

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// The global bottom navigation shelf: one continuous warm cream cardstock
// surface (same paper grain as CraftPanel's "paper" texture) with a dark
// handmade top outline and a soft upward contact shadow -- reads as
// physically attached to the bottom of the screen rather than a floating
// card, so it deliberately skips CraftPanel's wobbly all-around rounding
// and border. Safe-area handling is untouched: the app's root SafeAreaView
// already insets this container exactly as it did the nav bar it replaces.
export default function CraftBottomNav({ children, style }: Props) {
  const [gradId] = useState(() => `nav-hi-${Math.random().toString(36).slice(2)}`);

  return (
    <View style={[styles.shelf, style]}>
      <Image source={constructionPaper} resizeMode="cover" style={styles.grain} />
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#50321e" stopOpacity={0.06} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${gradId})`} />
      </Svg>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: {
    position: "relative",
    backgroundColor: CREAM,
    borderTopWidth: 3.5,
    borderTopColor: INK,
    overflow: "hidden",
    shadowColor: "#2A1C16",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 8,
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.21,
  },
  row: {
    flexDirection: "row",
    minHeight: 70,
  },
});
