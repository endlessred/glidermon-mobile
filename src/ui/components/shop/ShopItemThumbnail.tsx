// components/shop/ShopItemThumbnail.tsx
//
// Renders whichever real thumbnail a shop item actually has, without the
// caller needing to know which of the three source catalogs it came from.
// Purely presentational -- resolution lookup lives in data/shop/shopDisplay.
import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import CosmeticThumbnail from "../CosmeticThumbnail";
import PatternSwatch from "../PatternSwatch";
import { getFurnitureImageSource } from "../../../game/housing/assets/quadTextures";
import { getShopItemVisualSource } from "../../../data/shop/shopDisplay";
import type { ShopCatalogItem } from "../../../data/shop/shopTypes";

type Props = {
  item: ShopCatalogItem;
  size: number;
};

const CATEGORY_FALLBACK_EMOJI: Record<string, string> = {
  hat: "🎩",
  hair: "💇",
  shoes: "👟",
  outfit: "🧥",
  skin: "🎨",
  furniture: "🪑",
  floor: "🟫",
  wall: "🧱",
  accessory: "✨",
};

export default function ShopItemThumbnail({ item, size }: Props) {
  const source = getShopItemVisualSource(item);

  if (source?.kind === "cosmetic") {
    return (
      <CosmeticThumbnail
        itemId={source.itemId}
        socket={source.socket}
        size={size}
        style={styles.transparentThumb}
      />
    );
  }

  if (source?.kind === "furniture") {
    const image = getFurnitureImageSource(source.previewAsset);
    if (image) {
      return <Image source={image} style={{ width: size, height: size }} resizeMode="contain" />;
    }
  }

  if (source?.kind === "floorPattern" || source?.kind === "wallPattern") {
    return <PatternSwatch item={source.pattern} size={size} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size }]}>
      <Text style={{ fontSize: size * 0.5 }}>{CATEGORY_FALLBACK_EMOJI[item.category] ?? "❓"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  transparentThumb: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});
