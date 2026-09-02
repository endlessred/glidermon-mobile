// components/checkin/CheckInRewardCard.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, Image, Animated, Easing, StyleSheet } from "react-native";
import CraftPanel from "../handcrafted/CraftPanel";
import { useTheme } from "../../../data/hooks/useTheme";
import { INK, INK_MUTED, GOLD, FELT_ACORN, STAR_PATCH } from "./tokens";

type Props = {
  /** Acorns granted for this check-in (the immediate, primary reward). */
  acorns: number;
  /** Secondary reward: the daily-cap change this check-in unlocks, e.g.
   * "+0.17". Rendered under the acorns, visually quieter. */
  capBonus?: string;
  /** Attached to the inner content so a caller can fly acorns from here. */
  innerRef?: React.RefObject<View | null>;
  /** Delay (ms) before the card pops in, to stagger it after the dialogue. */
  popDelay?: number;
};

// The end-of-ritual reward, as a crafted card rather than a floating digital
// block: cream cardstock, a heavier stitched border to match the other
// cards, one small stitched star, a handmade felt acorn, and a clear "+N"
// figure as the primary line with the quieter cap-boost note beneath it.
// Pops in as a paper card, then the acorn figure gives a second small pop.
export default function CheckInRewardCard({ acorns, capBonus, innerRef, popDelay = 150 }: Props) {
  const { reduceMotion } = useTheme();
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const acornPop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    pop.setValue(0);
    acornPop.setValue(0);
    Animated.sequence([
      Animated.timing(pop, {
        toValue: 1,
        duration: 220,
        delay: popDelay,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.timing(acornPop, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(2.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, pop, acornPop, popDelay]);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const acornScale = acornPop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Animated.View style={{ opacity: pop, transform: [{ scale }], alignSelf: "stretch" }}>
      <CraftPanel texture="paper" stitched shadow="card" grainOpacity={0.1} inset={16} contentStyle={styles.content}>
        <Image source={STAR_PATCH} resizeMode="contain" style={styles.star} />
        <Text style={styles.heading}>Rewards</Text>

        <View ref={innerRef}>
          <Animated.View style={[styles.rewardRow, { transform: [{ scale: acornScale }] }]}>
            <Image source={FELT_ACORN} resizeMode="contain" style={styles.acorn} />
            <Text style={styles.amount}>+{acorns}</Text>
          </Animated.View>
        </View>

        {capBonus ? (
          <View style={styles.capRow}>
            <Text style={styles.capStar}>★</Text>
            <Text style={styles.capNote}>Daily acorn cap {capBonus}</Text>
          </View>
        ) : null}
      </CraftPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 0,
    alignItems: "center",
  },
  star: {
    position: "absolute",
    top: 4,
    right: 6,
    width: 20,
    height: 20,
    transform: [{ rotate: "12deg" }],
    opacity: 0.85,
  },
  heading: {
    color: INK_MUTED,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  acorn: {
    width: 30,
    height: 30,
  },
  amount: {
    color: INK,
    fontSize: 32,
    fontWeight: "800",
  },
  capRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },
  capStar: {
    color: GOLD,
    fontSize: 12,
  },
  capNote: {
    color: INK_MUTED,
    fontSize: 13,
  },
});
