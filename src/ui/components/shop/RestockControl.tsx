// components/shop/RestockControl.tsx
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import CraftActionButton from "../handcrafted/CraftActionButton";
import CraftConfirmModal from "../handcrafted/CraftConfirmModal";

// Wrapper for the row of restock sources -- today just the daily free
// restock, but structured so a future subscriber/rewarded-ad option can be
// added as another sibling child without restructuring this component.
export function RestockOptions({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function DailyFreeRestockOption({ available, onPress }: { available: boolean; onPress: () => void }) {
  return (
    <CraftActionButton
      label={available ? "↻ Restock Shops" : "Free restock used"}
      caption={available ? "1 free today" : "Available again tomorrow"}
      tone={available ? "green" : "cream"}
      disabled={!available}
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
});
