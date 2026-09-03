// ui/components/adventureBoard/DailyAdventureBoardPreview.tsx
//
// A compact framed presentation of the Daily Adventure Board for surfaces that
// don't have the world-space Spine object -- today just the Morning Check-In
// reveal step. It approximates the physical object (carved plaque + wooden
// frame + easel legs) with craft primitives so the reveal reads as "we're
// setting up the same board that ends up in the house" -- an object being
// revealed, not a full-screen UI page.
//
// Not pixel-matched to the Spine art. This component is the seam where a real
// render-target / screenshot of the Spine frame could later drop in.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CORK_BROWN, INK, CREAM_LIGHT, SHADOW_PANEL } from "../handcrafted/tokens";

type Props = {
  children: React.ReactNode;
  /** Carved-plaque label on the frame (matches the Spine board's plaque). */
  plaque?: string;
};

export default function DailyAdventureBoardPreview({
  children,
  plaque = "Today's Adventures",
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <View style={styles.plaque}>
          <Text style={styles.plaqueText}>{plaque}</Text>
        </View>
        {/* The cream board surface (BoardSurface) full-bleeds this opening --
            the wood frame's own padding is the only border. */}
        {children}
      </View>
      <View style={styles.legs}>
        <View style={[styles.leg, styles.legLeft]} />
        <View style={[styles.leg, styles.legRight]} />
      </View>
    </View>
  );
}

const FRAME = CORK_BROWN;

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", alignItems: "center", width: "100%", maxWidth: 330 },
  frame: {
    alignSelf: "stretch",
    backgroundColor: FRAME,
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 14,
    // These paddings ARE the wooden border around the full-bleed cream surface.
    paddingTop: 22,
    paddingBottom: 12,
    paddingHorizontal: 11,
    ...SHADOW_PANEL,
  },
  plaque: {
    position: "absolute",
    top: -13,
    alignSelf: "center",
    backgroundColor: CREAM_LIGHT,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 3,
  },
  plaqueText: { fontSize: 11.5, fontWeight: "800", letterSpacing: 1, color: INK },
  legs: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
    marginTop: -2,
  },
  leg: {
    width: 9,
    height: 24,
    backgroundColor: FRAME,
    borderWidth: 2,
    borderColor: INK,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  legLeft: { transform: [{ rotate: "8deg" }] },
  legRight: { transform: [{ rotate: "-8deg" }] },
});
