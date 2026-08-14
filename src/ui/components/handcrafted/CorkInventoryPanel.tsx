// components/handcrafted/CorkInventoryPanel.tsx
import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import CraftPanel, { PanelShadow } from "./CraftPanel";
import { CORK_BROWN } from "./tokens";

type CorkInventoryPanelProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  shadow?: PanelShadow;
};

// The corkboard container a CategoryTabRow sits on top of. Flat top corners
// (no rounded edge to peek out from behind the tabs) with the usual wobbly
// rounded bottom, so the tab row + this panel read as one continuous
// object rather than two stacked shapes. A bottom fade hides whatever
// partial grid row gets clipped by the panel's bottom edge, so a
// half-visible card never reads as a stray rendering artifact.
export default function CorkInventoryPanel({ children, style, contentStyle, shadow = "panel" }: CorkInventoryPanelProps) {
  return (
    <CraftPanel
      texture="cork"
      stitched={false}
      flatTop
      shadow={shadow}
      grainOpacity={0.13}
      style={style}
      contentStyle={contentStyle}
    >
      {children}
      <BottomFade />
    </CraftPanel>
  );
}

function BottomFade() {
  return (
    <View style={styles.fade} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="cork-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={CORK_BROWN} stopOpacity={0} />
            <Stop offset="1" stopColor={CORK_BROWN} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#cork-fade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
  },
});
