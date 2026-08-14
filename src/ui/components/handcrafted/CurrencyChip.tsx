// components/handcrafted/CurrencyChip.tsx
import React from "react";
import { Text, StyleSheet } from "react-native";
import CraftPanel from "./CraftPanel";
import { INK } from "./tokens";

type CurrencyChipProps = {
  count: number;
  icon?: string;
};

// A currency readout that fits the paper/cardstock material language --
// subtle texture + wobbly outline + soft shadow -- without going heavily
// decorative. Readability comes first.
export default function CurrencyChip({ count, icon = "🌰" }: CurrencyChipProps) {
  const safe = typeof count === "number" ? count : 0;
  return (
    <CraftPanel
      texture="paper"
      stitched={false}
      shadow="card"
      style={styles.wrap}
      contentStyle={styles.content}
      inset={10}
      accessibilityLabel={`You have ${safe} acorns`}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.count}>{safe.toLocaleString()}</Text>
    </CraftPanel>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 44,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  icon: {
    fontSize: 18,
  },
  count: {
    fontSize: 16,
    fontWeight: "800",
    color: INK,
  },
});
