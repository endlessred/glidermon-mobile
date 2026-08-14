// ui/screens/EquipScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Image, ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../data/hooks/useTheme";
import { useCosmeticsStore, CosmeticItem } from "../../data/stores/cosmeticsStore";
import { useOutfitStore, useActiveLocalOutfit } from "../../data/stores/outfitStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useToastStore } from "../../data/stores/toastStore";
import type { CosmeticSocket } from "../../data/types/outfitTypes";
import CosmeticThumbnail from "../components/CosmeticThumbnail";
import SpineCharacterPreview from "../components/SpineCharacterPreview";
import {
  CraftPanel,
  CraftTab,
  CategoryTabRow,
  CosmeticInventorySection,
  CorkInventoryPanel,
  InventoryHeader,
  CosmeticGrid,
  EquipSlotBadge,
  EquipSlotState,
  CosmeticCard,
  ContactShadow,
  CurrencyChip,
  INK,
} from "../components/handcrafted";

const hatIcon = require("../../assets/UI Assets/Icons/hat_icon.png");
const hairIcon = require("../../assets/UI Assets/Icons/hair_icon.png");
const shoeIcon = require("../../assets/UI Assets/Icons/shoe_icon.png");
const outfitIcon = require("../../assets/UI Assets/Icons/outfit_icon.png");
const skinIcon = require("../../assets/UI Assets/Icons/skin_icon.png");

// The catalog thumbnails already render on transparent backgrounds -- strip
// CosmeticThumbnail's own card chrome so they sit directly on ours instead
// of floating in a second nested box.
const transparentThumb = { backgroundColor: "transparent", borderWidth: 0 } as const;

// Hair doesn't have a color picker in this screen yet -- equip with a fixed
// default color (matching OutfitEditor's own default) rather than build a
// second-step color UI for now.
const DEFAULT_HAIR_RECOLOR = { r: "#f5deb3", g: "#fff8dc", b: "#daa520", a: "#ffff00" };

type CategoryId = "hats" | "hair" | "shoes" | "outfit" | "skin";

const SOCKET_FOR_CATEGORY: Record<CategoryId, CosmeticSocket> = {
  hats: "headTop",
  hair: "hair",
  shoes: "shoes",
  outfit: "jacket",
  skin: "skin",
};

const CATEGORIES: { id: CategoryId; label: string; icon: ImageSourcePropType }[] = [
  { id: "hats", label: "Hats", icon: hatIcon },
  { id: "hair", label: "Hair", icon: hairIcon },
  { id: "shoes", label: "Shoes", icon: shoeIcon },
  { id: "outfit", label: "Outfit", icon: outfitIcon },
  { id: "skin", label: "Skin", icon: skinIcon },
];

const EMPTY_MESSAGE: Record<CategoryId, string> = {
  hats: "No hats owned yet. Visit the Shop to find some!",
  hair: "No hair styles owned yet. Visit the Shop to find some!",
  shoes: "No shoes owned yet. Visit the Shop to find some!",
  outfit: "No outfits owned yet. Visit the Shop to find some!",
  skin: "No skins owned yet. Visit the Shop to find some!",
};

export default function EquipScreen() {
  const { spacing } = useTheme();
  const [category, setCategory] = useState<CategoryId>("hats");
  // Tapping a cosmetic previews it (on the character + as a gold "selected"
  // card) without touching real equip state. Equip state only changes when
  // the user confirms via the Equip button -- kept as a separate id so
  // "previewing" and "actually worn" can never be confused with each other.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const catalog = useCosmeticsStore(s => s.catalog);
  const owned = useCosmeticsStore(s => s.owned);
  const equipHat = useCosmeticsStore(s => s.equip);
  const unequipHat = useCosmeticsStore(s => s.unequipHead);

  const activeOutfit = useActiveLocalOutfit();
  const equipCosmetic = useOutfitStore(s => s.equipCosmetic);
  const equipSpineCosmetic = useOutfitStore(s => s.equipSpineCosmetic);
  const unequipCosmetic = useOutfitStore(s => s.unequipCosmetic);

  const acorns = useProgressionStore(s => s.acorns);
  const addToast = useToastStore(s => s.addToast);

  const hats = useMemo(() => catalog.filter(c => c.socket === "headTop" && owned[c.id]), [catalog, owned]);
  const hairs = useMemo(() => catalog.filter(c => c.socket === "hair" && owned[c.id]), [catalog, owned]);
  const shoes = useMemo(() => catalog.filter(c => c.socket === "shoes" && owned[c.id]), [catalog, owned]);
  const outfits = useMemo(() => catalog.filter(c => c.socket === "jacket" && owned[c.id]), [catalog, owned]);
  const skins = useMemo(() => catalog.filter(c => c.socket === "skin" && owned[c.id]), [catalog, owned]);

  const items: CosmeticItem[] =
    category === "hats"
      ? hats
      : category === "hair"
      ? hairs
      : category === "shoes"
      ? shoes
      : category === "outfit"
      ? outfits
      : skins;

  const categoryTotals: Record<CategoryId, number> = useMemo(
    () => ({
      hats: catalog.filter(c => c.socket === "headTop").length,
      hair: catalog.filter(c => c.socket === "hair").length,
      shoes: catalog.filter(c => c.socket === "shoes").length,
      outfit: catalog.filter(c => c.socket === "jacket").length,
      skin: catalog.filter(c => c.socket === "skin").length,
    }),
    [catalog]
  );

  // SpineCharacterPreview reads the hat from the *outfit's* cosmetics
  // (outfit.cosmetics.headTop), not the cosmeticsStore's global `equipped`
  // slot -- so hats are equipped in both places: cosmeticsStore stays in
  // sync for Shop/HUD screens that still read the global slot, while
  // outfitStore is what actually drives what the character renders here.
  const equippedHatId = activeOutfit?.cosmetics?.headTop?.itemId;
  const equippedHairId = activeOutfit?.cosmetics?.hair?.itemId;
  const equippedShoeId = activeOutfit?.cosmetics?.shoes?.itemId;
  const equippedOutfitId = activeOutfit?.cosmetics?.jacket?.itemId;
  const equippedSkinId = activeOutfit?.cosmetics?.skin?.itemId;

  const equippedIdForCategory = (cat: CategoryId) =>
    cat === "hats"
      ? equippedHatId
      : cat === "hair"
      ? equippedHairId
      : cat === "shoes"
      ? equippedShoeId
      : cat === "outfit"
      ? equippedOutfitId
      : equippedSkinId;

  const currentEquippedId = equippedIdForCategory(category);
  const activeCategory = CATEGORIES.find(c => c.id === category)!;

  // While something's selected (previewing, not yet equipped), show it on
  // the character by feeding SpineCharacterPreview a locally-patched copy
  // of the outfit -- the real outfitStore state is untouched until Equip.
  const previewOutfit = useMemo(() => {
    if (!activeOutfit || !selectedId) return activeOutfit;
    const socket = SOCKET_FOR_CATEGORY[category];
    const entry =
      category === "hair"
        ? { itemId: selectedId, spineData: { skinName: "default", maskRecolor: DEFAULT_HAIR_RECOLOR } }
        : { itemId: selectedId };
    return { ...activeOutfit, cosmetics: { ...activeOutfit.cosmetics, [socket]: entry } };
  }, [activeOutfit, selectedId, category]);

  const goToCategory = (cat: CategoryId) => {
    setCategory(cat);
    setSelectedId(null);
  };

  const handleSelectCard = (item: CosmeticItem) => {
    if (item.id === currentEquippedId) return;
    setSelectedId(prev => (prev === item.id ? null : item.id));
  };

  const commitEquip = (itemId: string, name: string) => {
    if (!activeOutfit) return;
    if (category === "hats") {
      equipHat(itemId);
      equipCosmetic(activeOutfit.id, "headTop", itemId);
    } else if (category === "hair") {
      equipSpineCosmetic(activeOutfit.id, "hair", itemId, {
        skinName: "default",
        maskRecolor: DEFAULT_HAIR_RECOLOR,
      });
    } else if (category === "shoes") {
      equipCosmetic(activeOutfit.id, "shoes", itemId);
    } else if (category === "outfit") {
      equipCosmetic(activeOutfit.id, "jacket", itemId);
    } else if (category === "skin") {
      equipCosmetic(activeOutfit.id, "skin", itemId);
    }
    addToast(`Equipped ${name}`);
  };

  const handleConfirmEquip = () => {
    if (!selectedId) return;
    const item = items.find(i => i.id === selectedId);
    commitEquip(selectedId, item?.name ?? "item");
    setSelectedId(null);
  };

  const handleUnequip = () => {
    if (!activeOutfit) return;
    if (category === "hats") {
      unequipHat();
      unequipCosmetic(activeOutfit.id, "headTop");
    } else if (category === "hair") unequipCosmetic(activeOutfit.id, "hair");
    else if (category === "shoes") unequipCosmetic(activeOutfit.id, "shoes");
    else if (category === "outfit") unequipCosmetic(activeOutfit.id, "jacket");
    else if (category === "skin") unequipCosmetic(activeOutfit.id, "skin");
  };

  const slotState = (cat: CategoryId, equippedId?: string): EquipSlotState =>
    category === cat && selectedId ? "selected" : equippedId ? "equipped" : "empty";

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <CraftPanel texture="kraft" shadow="card" style={styles.titlePanel} contentStyle={styles.titlePanelContent} inset={8}>
          <Text style={styles.title}>Glidermon Equip</Text>
        </CraftPanel>
        <CurrencyChip count={acorns} />
      </View>

      {/* Character + equip slots -- calm, uncluttered; Glidermon is the focus */}
      <CraftPanel texture="paper" shadow="panel" style={[styles.previewPanel, { marginHorizontal: spacing.lg }]}>
        <View style={[styles.badgeSlot, styles.badgeTL]}>
          <EquipSlotBadge label="Head" state={slotState("hats", equippedHatId)} onPress={() => goToCategory("hats")} size={60}>
            {category === "hats" && selectedId ? (
              <CosmeticThumbnail itemId={selectedId} socket="headTop" size={46} style={transparentThumb} />
            ) : equippedHatId ? (
              <CosmeticThumbnail itemId={equippedHatId} socket="headTop" size={46} style={transparentThumb} />
            ) : (
              <Image source={hatIcon} style={styles.slotPlaceholderIcon} resizeMode="contain" />
            )}
          </EquipSlotBadge>
        </View>
        <View style={[styles.badgeSlot, styles.badgeTR]}>
          <EquipSlotBadge label="Shoes" state={slotState("shoes", equippedShoeId)} onPress={() => goToCategory("shoes")} size={60}>
            {category === "shoes" && selectedId ? (
              <CosmeticThumbnail itemId={selectedId} socket="shoes" size={46} style={transparentThumb} />
            ) : equippedShoeId ? (
              <CosmeticThumbnail itemId={equippedShoeId} socket="shoes" size={46} style={transparentThumb} />
            ) : (
              <Image source={shoeIcon} style={styles.slotPlaceholderIcon} resizeMode="contain" />
            )}
          </EquipSlotBadge>
        </View>
        <View style={[styles.badgeSlot, styles.badgeBL]}>
          <EquipSlotBadge label="Outfit" state={slotState("outfit", equippedOutfitId)} onPress={() => goToCategory("outfit")} size={60}>
            {category === "outfit" && selectedId ? (
              <CosmeticThumbnail itemId={selectedId} socket="jacket" size={46} style={transparentThumb} />
            ) : equippedOutfitId ? (
              <CosmeticThumbnail itemId={equippedOutfitId} socket="jacket" size={46} style={transparentThumb} />
            ) : (
              <Image source={outfitIcon} style={styles.slotPlaceholderIcon} resizeMode="contain" />
            )}
          </EquipSlotBadge>
        </View>
        <View style={[styles.badgeSlot, styles.badgeBR]}>
          <EquipSlotBadge label="Skin" state={slotState("skin", equippedSkinId)} onPress={() => goToCategory("skin")} size={60}>
            {category === "skin" && selectedId ? (
              <CosmeticThumbnail itemId={selectedId} socket="skin" size={46} style={transparentThumb} />
            ) : equippedSkinId ? (
              <CosmeticThumbnail itemId={equippedSkinId} socket="skin" size={46} style={transparentThumb} />
            ) : (
              <Image source={skinIcon} style={styles.slotPlaceholderIcon} resizeMode="contain" />
            )}
          </EquipSlotBadge>
        </View>

        {activeOutfit ? (
          <View style={styles.characterWrap}>
            {/* SpineCharacterPreview's "medium"/"small" sizes aren't scaled
                proportionally to their canvas (character overflows the
                frame), so render at "large" and scale the whole thing down
                visually instead of relying on its built-in size prop. */}
            <View style={styles.characterClip}>
              <View style={styles.characterScale}>
                <SpineCharacterPreview outfit={previewOutfit ?? activeOutfit} size="large" transparent />
              </View>
            </View>
            <ContactShadow width={90} height={14} style={styles.contactShadow} />
          </View>
        ) : null}
      </CraftPanel>

      {/* Tabs + corkboard, welded into one continuous inventory object. */}
      <CosmeticInventorySection
        style={{ marginHorizontal: spacing.lg, marginTop: 10 }}
        tabs={<CategoryTabRow categories={CATEGORIES} selectedId={category} onSelect={goToCategory} />}
      >
        <CorkInventoryPanel style={styles.boardPanel} contentStyle={styles.boardPanelContent}>
          <InventoryHeader label={activeCategory.label} owned={items.length} total={categoryTotals[category]} />
          <CosmeticGrid
            items={items}
            keyExtractor={item => item.id}
            emptyMessage={EMPTY_MESSAGE[category]}
            renderItem={(item, index) => (
              <CosmeticCard
                name={item.name}
                state={item.id === selectedId ? "selected" : item.id === currentEquippedId ? "equipped" : "default"}
                rotationIndex={index}
                onPress={() => handleSelectCard(item)}
              >
                <CosmeticThumbnail itemId={item.id} socket={item.socket} size={64} style={transparentThumb} />
              </CosmeticCard>
            )}
          />
        </CorkInventoryPanel>
      </CosmeticInventorySection>

      {/* Footer: Equip confirms a pending selection; otherwise Unequip is
          available for whatever's currently worn in this category. */}
      {selectedId ? (
        <View style={[styles.footer, { paddingHorizontal: spacing.lg }]}>
          <CraftTab label="Equip" icon="✓" onPress={handleConfirmEquip} style={styles.removeButton} />
        </View>
      ) : currentEquippedId ? (
        <View style={[styles.footer, { paddingHorizontal: spacing.lg }]}>
          <CraftTab label="Unequip" icon="✕" onPress={handleUnequip} style={styles.removeButton} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#BFE0DA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 6,
  },
  titlePanel: {
    flex: 1,
    height: 60,
  },
  titlePanelContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: INK,
  },
  previewPanel: {
    marginTop: 8,
    height: 320,
  },
  badgeSlot: {
    position: "absolute",
    zIndex: 2,
  },
  badgeTL: { top: 10, left: 6 },
  badgeTR: { top: 10, right: 6 },
  badgeBL: { bottom: 10, left: 6 },
  badgeBR: { bottom: 10, right: 6 },
  slotPlaceholderIcon: {
    width: 28,
    height: 28,
    opacity: 0.4,
  },
  characterWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  characterClip: {
    width: 208,
    height: 260,
    marginTop: -6,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  characterScale: {
    transform: [{ scale: 1.04 }],
  },
  contactShadow: {
    marginTop: -76,
  },
  boardPanel: {
    flex: 1,
  },
  boardPanelContent: {
    flex: 1,
    paddingHorizontal: 22,
  },
  footer: {
    paddingTop: 2,
    paddingBottom: 8,
  },
  removeButton: {
    alignSelf: "center",
    minWidth: 160,
  },
});
