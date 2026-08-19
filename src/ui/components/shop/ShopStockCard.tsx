// components/shop/ShopStockCard.tsx
import React, { useState, useCallback } from "react";
import { Pressable, View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Path, G, Ellipse } from "react-native-svg";
import { wobblyRoundedRectPath } from "../handcrafted/wobblyPath";
import {
  INK,
  INK_MUTED,
  CREAM,
  FELT_GREEN,
  FELT_GREEN_DARK,
  GOLD,
  KRAFT_TAN,
  SHADOW_CARD,
  SHADOW_CARD_RAISED,
  CARD_ROTATIONS,
  LUMA_PEACH,
  SABLE_DUSTY_PURPLE,
} from "../handcrafted/tokens";

export type ShopStockCardState = "available" | "selected" | "sold";
export type ShopTone = "luma" | "sable";

type Props = {
  name: string;
  price: number;
  tone: ShopTone;
  state?: ShopStockCardState;
  rotationIndex?: number;
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode; // thumbnail
};

const STROKE_BY_STATE: Record<ShopStockCardState, string> = {
  available: INK,
  selected: GOLD,
  sold: INK_MUTED,
};

const FILL_BY_STATE: Record<ShopStockCardState, string> = {
  available: CREAM,
  selected: CREAM,
  sold: KRAFT_TAN,
};

const BACKING_COLOR_BY_TONE: Record<ShopTone, string> = {
  luma: LUMA_PEACH,
  sable: SABLE_DUSTY_PURPLE,
};

// A single hand-cut stock card: same wobbly-silhouette/stitched-inset/tiny-
// rotation mechanics as EquipScreen's CosmeticCard, with a reserved price
// row (so art stays vertically aligned between cards regardless of a
// one- vs two-line name) and a desaturated "sold" treatment instead of an
// equipped/locked one.
export default function ShopStockCard({ name, price, tone, state = "available", rotationIndex = 0, onPress, disabled, children }: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  }, []);

  const rotation = CARD_ROTATIONS[rotationIndex % CARD_ROTATIONS.length];
  const isSold = state === "sold";
  const isSelected = state === "selected";
  const strokeWidth = isSelected ? 3 : 2.5;
  const inset = 6;

  return (
    <Pressable
      onPress={isSold ? undefined : onPress}
      onLayout={onLayout}
      disabled={disabled || isSold}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: isSold }}
      accessibilityLabel={isSold ? `${name}, sold` : `${name}, ${price} acorns`}
      style={[
        styles.card,
        { transform: [{ rotate: `${rotation}deg` }] },
        isSelected ? SHADOW_CARD_RAISED : SHADOW_CARD,
        isSold && styles.soldOpacity,
      ]}
    >
      {size && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFillObject}>
          <Path
            d={wobblyRoundedRectPath(size.w, size.h, rotationIndex, 16)}
            fill={FILL_BY_STATE[state]}
            stroke={STROKE_BY_STATE[state]}
            strokeWidth={strokeWidth}
          />
          <G transform={`translate(${inset}, ${inset})`}>
            <Path
              d={wobblyRoundedRectPath(size.w - inset * 2, size.h - inset * 2, rotationIndex + 1, 11)}
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
            <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" pointerEvents="none">
              <Ellipse cx={50} cy={54} rx={42} ry={34} fill={isSold ? INK_MUTED : BACKING_COLOR_BY_TONE[tone]} opacity={isSold ? 0.12 : 0.22} />
            </Svg>
            <View style={isSold ? styles.thumbDesaturated : undefined}>{children}</View>
          </View>
        </View>
        <View style={styles.nameRegion}>
          <Text numberOfLines={2} style={[styles.name, isSold && styles.nameMuted]}>
            {name}
          </Text>
        </View>
        <View style={styles.priceRegion}>
          {isSold ? (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>✓ SOLD</Text>
            </View>
          ) : (
            <Text style={styles.price}>
              {price.toLocaleString()} 🌰
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 0.8,
    padding: 10,
  },
  soldOpacity: {
    opacity: 0.75,
  },
  content: {
    flex: 1,
  },
  artRegion: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbWrap: {
    width: "84%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbDesaturated: {
    opacity: 0.55,
  },
  nameRegion: {
    minHeight: 32,
    paddingTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 12.5,
    fontWeight: "700",
    color: INK,
    textAlign: "center",
  },
  nameMuted: {
    color: INK_MUTED,
  },
  priceRegion: {
    minHeight: 22,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  price: {
    fontSize: 14.5,
    fontWeight: "800",
    color: INK,
  },
  soldBadge: {
    backgroundColor: FELT_GREEN,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: FELT_GREEN_DARK,
  },
  soldBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFDF7",
    letterSpacing: 0.3,
  },
});
