// components/handcrafted/PaletteSwatch.tsx
import React, { useState } from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { CREAM, INK } from "./tokens";

type PaletteSwatchProps = {
  /** Palette colors in channel order -- sliced to `max` for display. */
  colors: string[];
  /** For a gradient-effect palette: the "light end" color per dot, same
   * length/order as `colors` (the "dark end"). When present, dots render
   * as a two-stop gradient fill instead of a flat color. */
  gradientTo?: string[];
  /** Diameter of each dot. */
  size?: number;
  /** How many dots to show. */
  max?: number;
  /** Small cream pill background + outline, for the card-corner badge use
   * case. Off for bare dots-in-a-row inside a PaletteCard. */
  chrome?: boolean;
  style?: StyleProp<ViewStyle>;
};

// A tiny "● ● ●" indicator representing a cosmetic's currently-selected
// colorway -- deliberately plain dots, not an artist-palette emoji, so it
// reads as "these are the colors" rather than "this is customizable art."
// Purely decorative/non-interactive: never the primary tap target.
export default function PaletteSwatch({ colors, gradientTo, size = 7, max = 3, chrome = true, style }: PaletteSwatchProps) {
  const [gradIdBase] = useState(() => `ps-grad-${Math.random().toString(36).slice(2)}`);
  const shown = colors.slice(0, max);
  if (shown.length === 0) return null;

  return (
    <View style={[styles.wrap, chrome && styles.chrome, style]} pointerEvents="none">
      {shown.map((c, i) => {
        const toColor = gradientTo?.[i];
        if (!toColor) {
          return (
            <View
              key={i}
              style={[
                styles.dot,
                { width: size, height: size, borderRadius: size / 2, backgroundColor: c },
              ]}
            />
          );
        }
        const gradId = `${gradIdBase}-${i}`;
        return (
          <Svg key={i} width={size} height={size} style={styles.dot}>
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={c} />
                <Stop offset="1" stopColor={toColor} />
              </LinearGradient>
            </Defs>
            <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradId})`} />
          </Svg>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  chrome: {
    backgroundColor: CREAM,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  dot: {
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.25)",
  },
});
