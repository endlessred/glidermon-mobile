// ui/components/adventureBoard/BoardSurface.tsx
//
// The writable cream board surface that sits *behind the wooden frame* -- for
// both the in-world Spine board (variant="house") and the check-in preview
// frame. It full-bleeds to the calibrated frame opening: the wooden frame
// supplies the physical border, so this has no outer outline, no large corner
// radius, and no external drop shadow -- just cream paper with a faint grain
// and a whisper of a top inner shade so it reads as mounted under the frame.
//
// Two independent concepts (see HouseBoardOverlay):
//   - the surface fills the opening (caller positions/sizes the wrapper)
//   - `contentStyle` is the comfortable padding between surface and goal content
import React from "react";
import { View, Image, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { BOARD_SURFACE } from "./boardStyles";

const paperGrain = require("../../../assets/UI Assets/Textures/ConstructionPaper.png");

type Props = {
  children: React.ReactNode;
  /** Padding between the (full-bleed) cream surface and the goal content. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Small radius matching the frame-opening clip. Kept minimal -- the wooden
   * opening dictates the real silhouette. */
  radius?: number;
  /** house: fill the caller's fixed-size box and centre content in it.
   * checkin: size to content. */
  fill?: boolean;
};

export default function BoardSurface({ children, contentStyle, radius = 4, fill = false }: Props) {
  return (
    <View style={[styles.surface, fill && styles.surfaceFill, { borderRadius: radius }]}>
      <Image source={paperGrain} resizeMode="cover" style={styles.grain} />
      <View style={styles.topShade} pointerEvents="none" />
      <View style={[fill ? styles.contentFill : styles.contentAuto, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: BOARD_SURFACE,
    overflow: "hidden",
  },
  surfaceFill: { flex: 1 },
  grain: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  // Barely-there shade along the top inner edge -- "tucked under the frame".
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "rgba(74,49,44,0.06)",
  },
  contentFill: { flex: 1, justifyContent: "center" },
  contentAuto: { flexGrow: 0 },
});
