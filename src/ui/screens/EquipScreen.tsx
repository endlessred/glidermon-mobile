// ui/screens/EquipScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../data/hooks/useTheme";
import { useCosmeticsStore, CosmeticItem } from "../../data/stores/cosmeticsStore";
import { useOutfitStore, useActiveLocalOutfit } from "../../data/stores/outfitStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useToastStore } from "../../data/stores/toastStore";
import CosmeticThumbnail from "../components/CosmeticThumbnail";
import SpineCharacterPreview from "../components/SpineCharacterPreview";
import AcornBadge from "../components/AcornBadge";
import { PaperPanel, CraftTab, EquipSlotBadge, ItemCard } from "../components/handcrafted";

const kraftPaper = require("../../assets/UI Assets/Textures/KraftPaper.png");
const thumbtack = require("../../assets/UI Assets/Decorations/ThumbtackGreen.png");
const leafAccent = require("../../assets/UI Assets/Decorations/LeafWithBuds.png");

// The catalog thumbnails already render on transparent backgrounds -- strip
// CosmeticThumbnail's own card chrome so they sit directly on ours instead
// of floating in a second nested box.
const transparentThumb = { backgroundColor: "transparent", borderWidth: 0 } as const;

type CategoryId = "hats" | "face" | "clothes" | "skin";

const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: "hats", label: "Hats", icon: "🎩" },
  { id: "face", label: "Face", icon: "👓" },
  { id: "clothes", label: "Clothes", icon: "👕" },
  { id: "skin", label: "Skin", icon: "🎨" },
];

const EMPTY_MESSAGE: Record<CategoryId, string> = {
  hats: "No hats owned yet. Visit the Shop to find some!",
  face: "Face slot is coming soon.",
  clothes: "No clothes owned yet. Visit the Shop to find some!",
  skin: "No skins owned yet. Visit the Shop to find some!",
};

export default function EquipScreen() {
  const { spacing } = useTheme();
  const [category, setCategory] = useState<CategoryId>("hats");

  const catalog = useCosmeticsStore(s => s.catalog);
  const owned = useCosmeticsStore(s => s.owned);
  const equipHat = useCosmeticsStore(s => s.equip);
  const unequipHat = useCosmeticsStore(s => s.unequipHead);

  const activeOutfit = useActiveLocalOutfit();
  const equipCosmetic = useOutfitStore(s => s.equipCosmetic);
  const unequipCosmetic = useOutfitStore(s => s.unequipCosmetic);

  const acorns = useProgressionStore(s => s.acorns);
  const addToast = useToastStore(s => s.addToast);

  const hats = useMemo(() => catalog.filter(c => c.socket === "headTop" && owned[c.id]), [catalog, owned]);
  const clothes = useMemo(() => catalog.filter(c => c.socket === "jacket" && owned[c.id]), [catalog, owned]);
  const skins = useMemo(() => catalog.filter(c => c.socket === "skin" && owned[c.id]), [catalog, owned]);

  const items: CosmeticItem[] = category === "hats" ? hats : category === "clothes" ? clothes : category === "skin" ? skins : [];

  const categoryTotals: Record<CategoryId, number> = useMemo(
    () => ({
      hats: catalog.filter(c => c.socket === "headTop").length,
      face: 0,
      clothes: catalog.filter(c => c.socket === "jacket").length,
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
  const equippedJacketId = activeOutfit?.cosmetics?.jacket?.itemId;
  const equippedSkinId = activeOutfit?.cosmetics?.skin?.itemId;

  const equippedIdForCategory = (cat: CategoryId) =>
    cat === "hats" ? equippedHatId : cat === "clothes" ? equippedJacketId : cat === "skin" ? equippedSkinId : undefined;

  const handleEquip = (item: CosmeticItem) => {
    if (category === "hats" && activeOutfit) {
      equipHat(item.id);
      equipCosmetic(activeOutfit.id, "headTop", item.id);
    } else if (category === "clothes" && activeOutfit) {
      equipCosmetic(activeOutfit.id, "jacket", item.id);
    } else if (category === "skin" && activeOutfit) {
      equipCosmetic(activeOutfit.id, "skin", item.id);
    }
    addToast(`Equipped ${item.name}`);
  };

  const handleRemove = () => {
    if (category === "hats" && activeOutfit) {
      unequipHat();
      unequipCosmetic(activeOutfit.id, "headTop");
    }
    else if (category === "clothes" && activeOutfit) unequipCosmetic(activeOutfit.id, "jacket");
    else if (category === "skin" && activeOutfit) unequipCosmetic(activeOutfit.id, "skin");
  };

  const currentEquippedId = equippedIdForCategory(category);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <PaperPanel texture="kraft" style={styles.titlePanel} contentStyle={styles.titlePanelContent} inset={8}>
          <Text style={styles.title}>Glidermon Equip</Text>
        </PaperPanel>
        <AcornBadge count={acorns} />
      </View>

      {/* Character + equip slots */}
      <PaperPanel texture="paper" style={[styles.previewPanel, { marginHorizontal: spacing.lg }]}>
        <Image source={thumbtack} style={styles.tack} />

        <View style={[styles.badgeSlot, styles.badgeTL]}>
          <EquipSlotBadge label="Head" filled={!!equippedHatId} onPress={() => setCategory("hats")} size={56}>
            {equippedHatId ? (
              <CosmeticThumbnail itemId={equippedHatId} socket="headTop" size={32} style={transparentThumb} />
            ) : (
              <Text style={styles.slotPlaceholder}>🎩</Text>
            )}
          </EquipSlotBadge>
        </View>
        <View style={[styles.badgeSlot, styles.badgeTR]}>
          <EquipSlotBadge label="Face" filled={false} onPress={() => setCategory("face")} size={56}>
            <Text style={styles.slotPlaceholder}>👓</Text>
          </EquipSlotBadge>
        </View>
        <View style={[styles.badgeSlot, styles.badgeBL]}>
          <EquipSlotBadge label="Clothes" filled={!!equippedJacketId} onPress={() => setCategory("clothes")} size={56}>
            {equippedJacketId ? (
              <CosmeticThumbnail itemId={equippedJacketId} socket="jacket" size={32} style={transparentThumb} />
            ) : (
              <Text style={styles.slotPlaceholder}>👕</Text>
            )}
          </EquipSlotBadge>
        </View>
        <View style={[styles.badgeSlot, styles.badgeBR]}>
          <EquipSlotBadge label="Skin" filled={!!equippedSkinId} onPress={() => setCategory("skin")} size={56}>
            {equippedSkinId ? (
              <CosmeticThumbnail itemId={equippedSkinId} socket="skin" size={32} style={transparentThumb} />
            ) : (
              <Text style={styles.slotPlaceholder}>🎨</Text>
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
                <SpineCharacterPreview outfit={activeOutfit} size="large" transparent />
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.hint}>
          <Image source={leafAccent} style={styles.leafIcon} />
          <Text style={styles.hintText}>Dress up your Glidermon and show off your style!</Text>
        </View>
      </PaperPanel>

      {/* Category tabs, flush against the corkboard panel below */}
      <View style={[styles.tabRow, { paddingHorizontal: spacing.lg }]}>
        {CATEGORIES.map(cat => (
          <CraftTab
            key={cat.id}
            label={cat.label}
            icon={cat.icon}
            shape="flushTop"
            selected={category === cat.id}
            disabled={cat.id === "face"}
            onPress={() => setCategory(cat.id)}
            style={styles.tab}
          />
        ))}
      </View>

      {/* Corkboard: item grid + owned counter */}
      <PaperPanel
        texture="cork"
        stitched={false}
        style={[styles.boardPanel, { marginHorizontal: spacing.lg, marginTop: -3 }]}
        contentStyle={styles.boardPanelContent}
      >
        <View style={styles.gridWrap}>
          {items.length === 0 ? (
            <PaperPanel
              texture="paper"
              stitched={false}
              style={styles.emptyPanel}
              contentStyle={styles.emptyPanelContent}
            >
              <Text style={styles.emptyText}>{EMPTY_MESSAGE[category]}</Text>
            </PaperPanel>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              numColumns={4}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContent}
              renderItem={({ item }) => (
                <View style={styles.gridCell}>
                  <ItemCard
                    name={item.name}
                    equipped={currentEquippedId === item.id}
                    onPress={() => handleEquip(item)}
                  >
                    <CosmeticThumbnail itemId={item.id} socket={item.socket} size={48} style={transparentThumb} />
                  </ItemCard>
                </View>
              )}
            />
          )}
        </View>

        {category !== "face" && (
          <Text style={styles.ownedCounter}>
            Owned: {items.length} / {categoryTotals[category]}
          </Text>
        )}
      </PaperPanel>

      {/* Footer */}
      {currentEquippedId && (
        <View style={[styles.footer, { paddingHorizontal: spacing.lg }]}>
          <CraftTab label="Remove" icon="✕" onPress={handleRemove} style={styles.removeButton} />
        </View>
      )}
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
    color: "#4A312C",
  },
  previewPanel: {
    marginTop: 8,
    height: 220,
  },
  tack: {
    position: "absolute",
    top: 2,
    left: "50%",
    marginLeft: -11,
    width: 22,
    height: 22,
    zIndex: 3,
    resizeMode: "contain",
  },
  badgeSlot: {
    position: "absolute",
    zIndex: 2,
  },
  badgeTL: { top: 22, left: 10 },
  badgeTR: { top: 22, right: 10 },
  badgeBL: { bottom: 24, left: 10 },
  badgeBR: { bottom: 24, right: 10 },
  slotPlaceholder: {
    fontSize: 18,
    opacity: 0.4,
  },
  characterWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  characterClip: {
    width: 116,
    height: 145,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  characterScale: {
    transform: [{ scale: 0.58 }],
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  leafIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  hintText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A312C",
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    zIndex: 2,
  },
  tab: {
    flex: 1,
  },
  boardPanel: {
    flex: 1,
  },
  boardPanelContent: {
    flex: 1,
  },
  gridWrap: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 12,
    gap: 10,
  },
  gridRow: {
    gap: 10,
  },
  gridCell: {
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
    color: "#4A312C",
    textAlign: "center",
    fontStyle: "italic",
  },
  ownedCounter: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A312C",
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    paddingVertical: 8,
  },
  removeButton: {
    alignSelf: "center",
    minWidth: 160,
  },
});
