// components/handcrafted/PaperPanel.tsx
import React from "react";
import { View, Image, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { INK, INK_MUTED, CREAM, FELT_GREEN, KRAFT_TAN, CORK_BROWN, WOBBLE_RADIUS } from "./tokens";

const kraftPaper = require("../../../assets/UI Assets/Textures/KraftPaper.png");
const corkboard = require("../../../assets/UI Assets/Textures/Corkboard.png");
const constructionPaper = require("../../../assets/UI Assets/Textures/ConstructionPaper.png");
const felt = require("../../../assets/UI Assets/Textures/Felt.png");

export type PaperTexture = "kraft" | "cork" | "paper" | "felt" | "none";

// The source PNGs are grayscale grain/noise maps, not colored photos -- laid
// over transparent they just look gray. So each texture gets a real base
// color and the grayscale PNG rides on top at low opacity purely as grain.
const TEXTURE_COLOR: Record<Exclude<PaperTexture, "none">, string> = {
  kraft: KRAFT_TAN,
  cork: CORK_BROWN,
  paper: CREAM,
  felt: FELT_GREEN,
};

const TEXTURE_IMAGE: Record<Exclude<PaperTexture, "none">, any> = {
  kraft: kraftPaper,
  cork: corkboard,
  paper: constructionPaper,
  felt,
};

type PaperPanelProps = {
  texture?: PaperTexture;
  stitched?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  inset?: number;
};

// A hand-cut paper card: colored fill with a faint paper-grain overlay, a
// solid ink outline, and an optional inset cream stitch line. Uses native
// borders/radii (not a stretched SVG path) so it never warps regardless of
// the box's aspect ratio.
export default function PaperPanel({
  texture = "paper",
  stitched = true,
  children,
  style,
  contentStyle,
  inset = 16,
}: PaperPanelProps) {
  return (
    <View style={[styles.wrap, texture !== "none" && { backgroundColor: TEXTURE_COLOR[texture] }, style]}>
      {texture !== "none" && (
        <Image source={TEXTURE_IMAGE[texture]} resizeMode="cover" style={styles.grain} />
      )}
      {stitched && <View style={styles.stitchInset} pointerEvents="none" />}
      <View style={[styles.content, { padding: inset }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    borderWidth: 3,
    borderColor: INK,
    overflow: "hidden",
    ...WOBBLE_RADIUS,
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
  },
  stitchInset: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: 2,
    borderColor: INK_MUTED,
    borderStyle: "dashed",
    opacity: 0.4,
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
});
