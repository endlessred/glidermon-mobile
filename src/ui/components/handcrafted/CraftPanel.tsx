// components/handcrafted/CraftPanel.tsx
import React, { useState } from "react";
import { View, Image, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import {
  INK,
  INK_MUTED,
  CREAM,
  FELT_GREEN,
  KRAFT_TAN,
  CORK_BROWN,
  WOBBLE_RADIUS,
  SHADOW_CARD,
  SHADOW_PANEL,
} from "./tokens";

const kraftPaper = require("../../../assets/UI Assets/Textures/KraftPaper.png");
const corkboard = require("../../../assets/UI Assets/Textures/Corkboard.png");
const constructionPaper = require("../../../assets/UI Assets/Textures/ConstructionPaper.png");
const felt = require("../../../assets/UI Assets/Textures/Felt.png");

export type PaperTexture = "kraft" | "cork" | "paper" | "felt" | "none";
export type PanelShadow = "panel" | "card" | "none";

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

type CraftPanelProps = {
  texture?: PaperTexture;
  stitched?: boolean;
  /** Soft contact shadow -- physical depth, not digital gloss. */
  shadow?: PanelShadow;
  /** Squares off the top corners (keeping the wobbly bottom ones) so
   * something can sit flush on top of it -- e.g. a tab row -- without a
   * rounded top edge peeking out from behind. */
  flatTop?: boolean;
  /** Opacity of the grain texture overlay -- lower reads as a calmer, less
   * contrasty surface (e.g. so the corkboard doesn't compete with cards). */
  grainOpacity?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  inset?: number;
  accessibilityLabel?: string;
};

// A hand-cut paper card: colored fill with a faint paper-grain overlay, a
// subtle top-left/bottom-right lighting hint, a solid ink outline, and an
// optional inset cream stitch line. Uses native borders/radii (not a
// stretched SVG path) so it never warps regardless of the box's aspect
// ratio. Reusable across screens -- Equip today, Shop/others later.
export default function CraftPanel({
  texture = "paper",
  stitched = true,
  shadow = "none",
  flatTop = false,
  grainOpacity = 0.16,
  children,
  style,
  contentStyle,
  inset = 16,
  accessibilityLabel,
}: CraftPanelProps) {
  const [gradId] = useState(() => `cp-hi-${Math.random().toString(36).slice(2)}`);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.wrap,
        texture !== "none" && { backgroundColor: TEXTURE_COLOR[texture] },
        shadow === "panel" && SHADOW_PANEL,
        shadow === "card" && SHADOW_CARD,
        flatTop && styles.flatTop,
        style,
      ]}
    >
      {texture !== "none" && (
        <Image source={TEXTURE_IMAGE[texture]} resizeMode="cover" style={[styles.grain, { opacity: grainOpacity }]} />
      )}
      {/* Almost-subconscious lighting hint: faint highlight top-left, faint
          warm shadow bottom-right. Not a visible "gradient panel" look. */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#50321e" stopOpacity={0.05} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${gradId})`} />
      </Svg>
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
  flatTop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
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
