// components/handcrafted/CategoryTabRow.tsx
import React from "react";
import { View, StyleSheet, ImageSourcePropType } from "react-native";
import CosmeticCategoryTab from "./CosmeticCategoryTab";

export type Category<T extends string = string> = { id: T; label: string; icon: ImageSourcePropType };

type CategoryTabRowProps<T extends string> = {
  categories: Category<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
};

// Row of CosmeticCategoryTabs -- meant to be passed as CosmeticInventorySection's
// `tabs` slot, which handles sitting it in front of/overlapping the panel below.
export default function CategoryTabRow<T extends string>({ categories, selectedId, onSelect }: CategoryTabRowProps<T>) {
  return (
    <View style={styles.row}>
      {categories.map(cat => (
        <CosmeticCategoryTab
          key={cat.id}
          label={cat.label}
          icon={cat.icon}
          selected={selectedId === cat.id}
          onPress={() => onSelect(cat.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 5,
  },
});
