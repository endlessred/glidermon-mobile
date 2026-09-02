// components/checkin/CheckInCompleteStep.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import CheckInDialogueCard from "./CheckInDialogueCard";
import CheckInRewardCard from "./CheckInRewardCard";
import CraftPrimaryButton from "./CraftPrimaryButton";

type Props = {
  title: string;
  message: string;
  acorns: number;
  /** The daily-cap delta this check-in unlocks, e.g. "+0.17". */
  capBonus?: string;
  onDone: () => void;
  /** Attached to the reward figure for a caller's acorn-flight origin. */
  rewardRef?: React.RefObject<View | null>;
};

// Shared terminal step for every check-in flow: a calm completion moment --
// GliderMon's closing line, a crafted reward card, and a single "Done" CTA
// that exits the ritual. Encouraging, not a fireworks celebration. The
// positive character reaction is the shared hero animation (CheckIn/Cheer),
// set by the flow. The dialogue card pops in first, the reward card a beat
// later, then the acorn figure gives a small pop of its own.
export default function CheckInCompleteStep({ title, message, acorns, capBonus, onDone, rewardRef }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.cards}>
        <CheckInDialogueCard title={title} text={message} compact popIn popDelay={40} />
        <CheckInRewardCard acorns={acorns} capBonus={capBonus} innerRef={rewardRef} popDelay={190} />
      </View>
      <CraftPrimaryButton label="Done" accent="green" size="lg" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    gap: 14,
  },
  cards: {
    alignSelf: "stretch",
    gap: 8,
  },
});
