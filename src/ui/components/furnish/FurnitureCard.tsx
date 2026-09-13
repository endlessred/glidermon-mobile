// ui/components/furnish/FurnitureCard.tsx
//
// Thin wrapper around the existing CosmeticCard -- same wobbly cardstock
// silhouette, stitched dashed inset, gold "previewing"/green "placed" states
// Outfit already uses, just relabeled PLACED instead of EQUIPPED (furniture
// is placed, not equipped) and with no price (nothing to suppress --
// CosmeticCard never rendered a price to begin with).
import React from "react";
import { Image, StyleSheet } from "react-native";
import CosmeticCard, { CosmeticCardState } from "../handcrafted/CosmeticCard";
import { getFurnitureImageSource } from "../../../game/housing/assets/quadTextures";

type Props = {
  name: string;
  previewAsset: string;
  /** "default" = not the current draft placement, "selected" = tapped this
   * session but not the previous confirmed state (mirrors Outfit's
   * previewing-vs-confirmed distinction), "equipped" = the current draft
   * placement for this slot (rendered with the PLACED pill via CosmeticCard's
   * equippedLabel). */
  state: CosmeticCardState;
  rotationIndex?: number;
  onPress: () => void;
};

export default function FurnitureCard({ name, previewAsset, state, rotationIndex = 0, onPress }: Props) {
  const image = getFurnitureImageSource(previewAsset);
  return (
    <CosmeticCard name={name} state={state} rotationIndex={rotationIndex} onPress={onPress} equippedLabel="PLACED">
      {image ? <Image source={image} style={styles.image} resizeMode="contain" /> : null}
    </CosmeticCard>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});
