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
import { INK_MUTED } from "../handcrafted/tokens";

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
    // Reads as a physical material sample chip -- thin cream border, slight
    // rotation, small contact shadow -- rather than a plain floating
    // rectangle, since these are the one item type that's genuinely "just
    // a swatch" rather than an isolated object/cosmetic preview.
    const swatchSize = size * 0.78;
    return (
      <View style={styles.swatchFrame}>
        <PatternSwatch item={source.pattern} size={swatchSize} />
      </View>
    );
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
  swatchFrame: {
    padding: 3,
    borderRadius: 5,
    backgroundColor: "#FFFDF7",
    borderWidth: 1.5,
    borderColor: INK_MUTED,
    transform: [{ rotate: "-3.5deg" }],
    shadowColor: "#2A1C16",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
});
