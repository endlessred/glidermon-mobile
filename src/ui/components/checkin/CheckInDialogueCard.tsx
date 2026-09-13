// components/checkin/CheckInDialogueCard.tsx
import React, { useEffect, useRef } from "react";
import { Text, Animated, Easing, StyleSheet, StyleProp, ViewStyle } from "react-native";
import CraftPanel from "../handcrafted/CraftPanel";
import { useTheme } from "../../../data/hooks/useTheme";
import { INK, INK_MUTED, LAVENDER_PAPER } from "./tokens";

type Props = {
  /** Optional emphasised first line (e.g. "Goal set!"). */
  title?: string;
  /** Body copy -- GliderMon's line for this step. */
  text?: string;
  /** Arbitrary content instead of `text`. */
  children?: React.ReactNode;
  /** cream = default paper, lavender = pale-lavender note for greetings. */
  tone?: "cream" | "lavender";
  /** Tighter padding -- used on the completion screen where the card shares
   * space with the reward card. */
  compact?: boolean;
  /** Small scale/fade pop on mount (completion sequence). */
  popIn?: boolean;
  /** Delay (ms) before the pop, to stagger against sibling cards. */
  popDelay?: number;
  style?: StyleProp<ViewStyle>;
};

// GliderMon's spoken line for a step: a hand-cut paper note (CraftPanel's
// cream cardstock + faint grain + dashed stitch inset + soft physical
// shadow), dark-brown text, centered. The lavender tone is used for the
// opening greeting so it reads as a warm "good morning" note.
export default function CheckInDialogueCard({
  title, text, children, tone = "cream", compact = false, popIn = false, popDelay = 0, style,
}: Props) {
  const { reduceMotion } = useTheme();
  const pop = useRef(new Animated.Value(popIn && !reduceMotion ? 0 : 1)).current;

  useEffect(() => {
    if (!popIn || reduceMotion) return;
    pop.setValue(0);
    Animated.timing(pop, {
      toValue: 1,
      duration: 200,
      delay: popDelay,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  }, [popIn, popDelay, reduceMotion, pop]);

  return (
    <Animated.View
      style={{
        opacity: pop,
        transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        alignSelf: "stretch",
      }}
    >
      <CraftPanel
        texture="paper"
        stitched
        shadow="card"
        grainOpacity={0.09}
        inset={compact ? 14 : 18}
        style={[tone === "lavender" && styles.lavender, style]}
        contentStyle={styles.content}
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {text ? <Text style={styles.text}>{text}</Text> : children}
      </CraftPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lavender: {
    backgroundColor: LAVENDER_PAPER,
  },
  content: {
    flex: 0,
    alignItems: "center",
  },
  title: {
    color: INK,
    fontWeight: "800",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 4,
  },
  text: {
    color: INK,
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
  },
});
