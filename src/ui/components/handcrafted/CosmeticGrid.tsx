// components/handcrafted/CosmeticGrid.tsx
import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import CraftPanel from "./CraftPanel";
import { INK } from "./tokens";

type CosmeticGridProps<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactElement;
  emptyMessage: string;
  numColumns?: number;
};

// 3-wide (by default) grid of CosmeticCards, with a paper "nothing here yet"
// panel when the category is empty. The grid itself doesn't know about
// cosmetics -- callers supply `renderItem` (typically a <CosmeticCard>).
export default function CosmeticGrid<T>({
  items,
  keyExtractor,
  renderItem,
  emptyMessage,
  numColumns = 3,
}: CosmeticGridProps<T>) {
  if (items.length === 0) {
    return (
      <CraftPanel texture="paper" stitched={false} style={styles.emptyPanel} contentStyle={styles.emptyPanelContent}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </CraftPanel>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      renderItem={({ item, index }) => <View style={styles.cell}>{renderItem(item, index)}</View>}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
    gap: 14,
  },
  row: {
    gap: 14,
  },
  cell: {
    flex: 1,
  },
  emptyPanel: {
    height: 72,
  },
  emptyPanelContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: INK,
    textAlign: "center",
    fontStyle: "italic",
  },
});
