// components/shop/RestockControl.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import CraftActionButton from "../handcrafted/CraftActionButton";
import CraftConfirmModal from "../handcrafted/CraftConfirmModal";
import { INK_MUTED, KRAFT_TAN } from "../handcrafted/tokens";

// Wrapper for the row of restock sources -- today just the daily free
// restock, but structured so a future subscriber/rewarded-ad option can be
// added as another sibling child without restructuring this component.
export function RestockOptions({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function DailyFreeRestockOption({ available, onPress }: { available: boolean; onPress: () => void }) {
  // Once used, this collapses to a quiet single-line status strip -- the
  // full-size actionable button only makes sense while there's still an
  // action to take.
  if (!available) {
    return (
      <View style={styles.usedStrip} accessibilityRole="text">
        <Text style={styles.usedStripText}>✓ Free restock used · Resets tomorrow</Text>
      </View>
    );
  }

  return (
    <CraftActionButton
      label="↻ Restock Shops"
      caption="1 free today"
      tone="green"
      onPress={onPress}
      style={styles.button}
    />
  );
}

type Props = {
  freeRestockAvailable: boolean;
  /** Called only after the player confirms in the "Restock both shops?" sheet. */
  onConfirmRestock: () => void;
};

// Owns the confirmation step so a single mistap can never spend the day's
// free restock -- RestockOptions/DailyFreeRestockOption are dumb, this is
// the only thing that opens CraftConfirmModal.
export default function RestockControl({ freeRestockAvailable, onConfirmRestock }: Props) {
  const [confirmVisible, setConfirmVisible] = useState(false);

  return (
    <>
      <RestockOptions>
        <DailyFreeRestockOption available={freeRestockAvailable} onPress={() => setConfirmVisible(true)} />
        {/* future: <SubscriberRestockOption /> <RewardedAdRestockOption /> */}
      </RestockOptions>

      <CraftConfirmModal
        visible={confirmVisible}
        title="Restock both shops?"
        message="Luma and Sable will each get 6 new items."
        confirmLabel="Restock"
        cancelLabel="Cancel"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => {
          setConfirmVisible(false);
          onConfirmRestock();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 12,
  },
  button: {
    alignSelf: "stretch",
  },
  usedStrip: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: KRAFT_TAN,
    opacity: 0.5,
  },
  usedStripText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: INK_MUTED,
  },
});
