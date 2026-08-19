// components/handcrafted/CosmeticCard.tsx
import React, { useState, useCallback } from "react";
import { Pressable, View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import CheckBadge from "./CheckBadge";
import CardBacking from "./CardBacking";
import PaletteSwatch from "./PaletteSwatch";
import { wobblyRoundedRectPath } from "./wobblyPath";
import {
  INK,
  INK_MUTED,
  CREAM,
  FELT_GREEN,
  FELT_GREEN_DARK,
  GOLD,
  LOCK_GRAY,
  SHADOW_CARD,
  SHADOW_CARD_RAISED,
  CARD_ROTATIONS,
} from "./tokens";

export type CosmeticCardState = "default" | "selected" | "equipped" | "locked";

type CosmeticCardProps = {
  name: string;
  state?: CosmeticCardState;
  /** Cycled into CARD_ROTATIONS -- pass the item's grid index. */
  rotationIndex?: number;
  /** Seeds the wobbly silhouette so it's stable across re-renders but varies per card. */
  seed?: number;
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode; // thumbnail
  /** When present, shows a small non-interactive colorway badge in the
   * card's upper-right corner reflecting the currently-selected palette.
   * Omit entirely for cosmetics that aren't recolorable. */
  paletteSwatchColors?: string[];
};

const STROKE_BY_STATE: Record<CosmeticCardState, string> = {
  default: INK,
  selected: GOLD,
  equipped: FELT_GREEN_DARK,
  locked: INK_MUTED,
};

const FILL_BY_STATE: Record<CosmeticCardState, string> = {
  default: CREAM,
  selected: CREAM,
  equipped: "#EAF4DB",
  locked: LOCK_GRAY,
};

// A single small piece of "cardstock" sitting on the corkboard: wobbly
// hand-cut silhouette (SVG, so it never warps to fit real content), inset
// dashed stitch line, a subtle backing shape behind the artwork, and a
// deterministic tiny rotation. Reusable anywhere cosmetics are browsed.
export default function CosmeticCard({
  name,
  state = "default",
  rotationIndex = 0,
  seed,
  onPress,
  disabled,
  children,
  paletteSwatchColors,
}: CosmeticCardProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const cardSeed = seed ?? rotationIndex;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  }, []);

  const rotation = CARD_ROTATIONS[rotationIndex % CARD_ROTATIONS.length];
  const isEquipped = state === "equipped";
  const isLocked = state === "locked";
  const isRaised = state === "equipped" || state === "selected";
  const strokeWidth = isEquipped || state === "selected" ? 3 : 2.5;
  const inset = 6;

  return (
    <Pressable
      onPress={isLocked ? undefined : onPress}
      onLayout={onLayout}
      disabled={disabled || isLocked}
      accessibilityRole="button"
      accessibilityState={{ selected: isEquipped, disabled: isLocked }}
      style={[
        styles.card,
        { transform: [{ rotate: `${rotation}deg` }] },
        isRaised ? SHADOW_CARD_RAISED : SHADOW_CARD,
        isLocked && styles.lockedOpacity,
      ]}
    >
      {size && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFillObject}>
          <Path
            d={wobblyRoundedRectPath(size.w, size.h, cardSeed, 16)}
            fill={FILL_BY_STATE[state]}
            stroke={STROKE_BY_STATE[state]}
            strokeWidth={strokeWidth}
          />
          <G transform={`translate(${inset}, ${inset})`}>
            <Path
              d={wobblyRoundedRectPath(size.w - inset * 2, size.h - inset * 2, cardSeed + 1, 11)}
              fill="none"
              stroke={STROKE_BY_STATE[state]}
              strokeWidth={1.5}
              strokeDasharray="4,3"
              opacity={0.4}
            />
          </G>
        </Svg>
      )}

      <View style={styles.content}>
        <View style={styles.artRegion}>
          <View style={styles.thumbWrap}>
            <CardBacking />
            {children}
          </View>
        </View>
        <View style={styles.nameRegion}>
          <Text numberOfLines={2} style={styles.name}>
            {name}
          </Text>
        </View>
      </View>

      {isEquipped && (
        <View style={styles.tag}>
          <Text style={styles.tagText}>EQUIPPED</Text>
        </View>
      )}
      {isEquipped && <CheckBadge size={18} style={styles.badge} />}
      {paletteSwatchColors && paletteSwatchColors.length > 0 && (
        <PaletteSwatch colors={paletteSwatchColors} max={3} style={styles.paletteBadge} />
      )}
      {isLocked && (
        <View style={styles.lockOverlay}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 0.82,
    padding: 10,
  },
  lockedOpacity: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  // Fixed regions rather than one centered flex group, so a two-line name
  // never pushes the artwork off its own center -- the art region always
  // gets the same share of the card regardless of how the name wraps.
  artRegion: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbWrap: {
    width: "78%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRegion: {
    minHeight: 36,
    paddingTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: INK,
    textAlign: "center",
  },
  tag: {
    position: "absolute",
    top: 7,
    left: 7,
    backgroundColor: FELT_GREEN,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    zIndex: 2,
  },
  tagText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#FFFDF7",
    letterSpacing: 0.2,
  },
  // Hangs slightly off the card's own corner (like the equip-slot badges)
  // rather than sitting inset over the content, so it never collides with
  // a two-line name.
  badge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    zIndex: 2,
  },
  paletteBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    zIndex: 2,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: {
    fontSize: 26,
    opacity: 0.55,
  },
});
