// components/checkin/CheckInHeader.tsx
import React from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import {
  INK,
  INK_MUTED,
  CREAM_LIGHT,
  SUNRISE_YELLOW,
  GOLD,
  WOBBLE_RADIUS_SM,
  PAPER_GRAIN,
} from "./tokens";

type Props = {
  title: string;
  onClose: () => void;
  /** Small handmade sunrise mark before the title. */
  sunrise?: boolean;
};

// A tiny hand-drawn sunrise: a filled half-disc on a baseline with three
// short rays. Deliberately small and quiet -- the header is not a decorated
// surface.
function SunriseMark() {
  return (
    <Svg width={22} height={16} viewBox="0 0 22 16">
      <Line x1={11} y1={1} x2={11} y2={4} stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={3.5} y1={4} x2={5.5} y2={6} stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={18.5} y1={4} x2={16.5} y2={6} stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M3 13 A8 8 0 0 1 19 13 Z" fill={SUNRISE_YELLOW} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <Line x1={1} y1={13.5} x2={21} y2={13.5} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

// Header for the check-in ritual: dark-brown title on a subtle warm
// cardstock strip, an optional small sunrise mark, and a quiet
// hand-outlined close control. Kept intentionally plain.
export default function CheckInHeader({ title, onClose, sunrise = true }: Props) {
  return (
    <View style={styles.bar}>
      <Image source={PAPER_GRAIN} resizeMode="cover" style={styles.grain} />
      <View style={styles.titleRow}>
        {sunrise ? <SunriseMark /> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close check-in"
        style={styles.close}
      >
        <Text style={styles.closeGlyph}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CREAM_LIGHT,
    borderBottomWidth: 1.5,
    borderBottomColor: INK_MUTED,
    overflow: "hidden",
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: INK,
    fontSize: 18,
    fontWeight: "800",
  },
  close: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: INK_MUTED,
    backgroundColor: CREAM_LIGHT,
    ...WOBBLE_RADIUS_SM,
  },
  closeGlyph: {
    color: INK_MUTED,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
});
