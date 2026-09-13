// components/checkin/CheckInChoiceGroup.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { INK_MUTED } from "./tokens";

type Props = {
  label: string;
  children: React.ReactNode;
};

// A small uppercase section heading + its stack of CheckInChoiceCards.
// Groups a long option list ("Time in range" / "Highs" / "Lows") into
// scannable clusters instead of one undifferentiated column.
export default function CheckInChoiceGroup({ label, children }: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.heading}>{label}</Text>
      <View style={styles.stack}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
  },
  heading: {
    color: INK_MUTED,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  stack: {
    gap: 9,
  },
});
