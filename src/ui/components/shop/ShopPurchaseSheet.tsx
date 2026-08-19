// components/shop/ShopPurchaseSheet.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { useTheme } from "../../../data/hooks/useTheme";
import CraftPanel from "../handcrafted/CraftPanel";
import CraftActionButton from "../handcrafted/CraftActionButton";
import ShopItemThumbnail from "./ShopItemThumbnail";
import { INK, INK_MUTED } from "../handcrafted/tokens";
import type { ShopCatalogItem } from "../../../data/shop/shopTypes";

type Props = {
  item: ShopCatalogItem | null;
  canAfford: boolean;
  onBuy: () => void;
  onDismiss: () => void;
};

// Lightweight bottom purchase sheet (spec's "Option A") -- deliberately not
// a full modal/scrim so the stock grid above stays visible and tappable;
// selecting a different card just swaps this sheet's contents rather than
// requiring a close-then-reopen.
export default function ShopPurchaseSheet({ item, canAfford, onBuy, onDismiss }: Props) {
  const { reduceMotion } = useTheme();
  const [mounted, setMounted] = useState(!!item);
  const [renderedItem, setRenderedItem] = useState(item);
  const slideA = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (item) {
      setRenderedItem(item);
      setMounted(true);
      if (reduceMotion) {
        slideA.setValue(1);
      } else {
        Animated.timing(slideA, { toValue: 1, duration: 200, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
      }
    } else if (mounted) {
      if (reduceMotion) {
        setMounted(false);
      } else {
        Animated.timing(slideA, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => setMounted(false));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, reduceMotion]);

  if (!mounted || !renderedItem) return null;

  const translateY = slideA.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  return (
    <Animated.View style={[styles.wrap, { opacity: slideA, transform: [{ translateY }] }]} pointerEvents="box-none">
      <CraftPanel texture="paper" stitched shadow="card" inset={14} style={styles.panel} contentStyle={styles.content}>
        <View style={styles.thumbWrap}>
          <ShopItemThumbnail item={renderedItem} size={44} />
        </View>
        <View style={styles.infoWrap}>
          <Text numberOfLines={1} style={styles.name}>{renderedItem.name}</Text>
          <Text style={styles.price}>{renderedItem.price.toLocaleString()} 🌰</Text>
          {!canAfford && <Text style={styles.notEnough}>Not enough acorns</Text>}
        </View>
        <CraftActionButton
          label="Buy"
          tone="gold"
          disabled={!canAfford}
          onPress={onBuy}
          style={styles.buyButton}
        />
      </CraftPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  panel: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  thumbWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  infoWrap: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: INK,
  },
  price: {
    fontSize: 13,
    fontWeight: "800",
    color: INK,
    marginTop: 1,
  },
  notEnough: {
    fontSize: 10.5,
    color: INK_MUTED,
    marginTop: 1,
  },
  buyButton: {
    width: 84,
    alignSelf: "center",
  },
});
