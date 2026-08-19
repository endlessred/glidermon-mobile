// components/shop/ShopStockGrid.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import { useTheme } from "../../../data/hooks/useTheme";
import ShopStockCard, { ShopTone } from "./ShopStockCard";
import ShopItemThumbnail from "./ShopItemThumbnail";
import type { ShopStockSlot } from "../../../data/stores/shopStockStore";
import type { ShopCatalogItem } from "../../../data/shop/shopTypes";

export interface ShopStockDisplayItem {
  slot: ShopStockSlot;
  catalogItem: ShopCatalogItem | undefined;
}

type Props = {
  items: ShopStockDisplayItem[];
  tone: ShopTone;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  /** Bump this whenever a restock (natural or manual) replaces `items` --
   * triggers the brief settle/pop transition rather than an abrupt swap. */
  transitionKey: number;
};

const COLUMNS = 3;

// Fixed 3x2 stock grid. Restock transitions are driven purely by
// `transitionKey` changing -- this component never decides to regenerate
// anything itself, it only animates between whatever `items` it's given.
export default function ShopStockGrid({ items, tone, selectedItemId, onSelectItem, transitionKey }: Props) {
  const { reduceMotion } = useTheme();
  const gridOpacity = useRef(new Animated.Value(1)).current;
  const gridScale = useRef(new Animated.Value(1)).current;
  const lastKeyRef = useRef(transitionKey);

  useEffect(() => {
    if (transitionKey === lastKeyRef.current) return;
    lastKeyRef.current = transitionKey;

    if (reduceMotion) return; // items already reflect the new stock, nothing to animate

    gridScale.setValue(0.985);
    Animated.sequence([
      Animated.timing(gridOpacity, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(gridOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(gridScale, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      ]),
    ]).start();
  }, [transitionKey, reduceMotion, gridOpacity, gridScale]);

  return (
    <Animated.View style={[styles.grid, { opacity: gridOpacity, transform: [{ scale: gridScale }] }]}>
      {items.map(({ slot, catalogItem }, index) => {
        if (!catalogItem) return <View key={slot.itemId} style={styles.cardSlot} />;
        const state = slot.sold ? "sold" : selectedItemId === slot.itemId ? "selected" : "available";
        return (
          <View key={slot.itemId} style={styles.cardSlot}>
            <ShopStockCard
              name={catalogItem.name}
              price={catalogItem.price}
              tone={tone}
              state={state}
              rotationIndex={index}
              onPress={() => onSelectItem(slot.itemId)}
            >
              <ShopItemThumbnail item={catalogItem} size={56} />
            </ShopStockCard>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  cardSlot: {
    width: `${100 / COLUMNS}%`,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
});
