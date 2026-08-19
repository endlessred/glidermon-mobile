// components/ColorwaySheet.tsx
import React from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CraftPanel, PaletteCard, INK, CREAM, GOLD } from "./handcrafted";
import { useCosmeticsStore, type CosmeticItem } from "../../data/stores/cosmeticsStore";
import { useToastStore } from "../../data/stores/toastStore";
import ToastHost from "./ToastHost";
import { DEFAULT_PALETTE_ID, isPaletteLocked } from "../../data/cosmetics/palette";

type ColorwaySheetProps = {
  visible: boolean;
  item: CosmeticItem | null | undefined;
  selectedPaletteId?: string;
  onSelectPalette: (paletteId: string) => void;
  onClose: () => void;
};

// A crafted bottom sheet for choosing a premade colorway -- part of the
// Outfit experience, not a separate screen. The character preview stays on
// the Outfit screen behind this; the sheet only controls which palette is
// active, it never renders its own character.
export default function ColorwaySheet({
  visible,
  item,
  selectedPaletteId,
  onSelectPalette,
  onClose,
}: ColorwaySheetProps) {
  const hasPlus = useCosmeticsStore(s => s.hasPlus);
  const devSetPlus = useCosmeticsStore(s => s.devSetPlus);
  const addToast = useToastStore(s => s.addToast);

  const palettes = item?.palettes ?? [];
  const activeId = selectedPaletteId ?? DEFAULT_PALETTE_ID;

  const handlePress = (paletteId: string, locked: boolean) => {
    if (locked) {
      addToast("Unlock Plus for animated colorways");
      return;
    }
    onSelectPalette(paletteId);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
        <CraftPanel texture="kraft" shadow="card" style={styles.headerPanel} contentStyle={styles.headerContent} inset={12}>
          <Text style={styles.title} numberOfLines={1}>
            {item ? `${item.name} Colors` : "Colors"}
          </Text>
          {__DEV__ && (
            <Pressable onPress={() => devSetPlus(!hasPlus)} accessibilityRole="button" style={styles.devButton}>
              <Text style={styles.devButtonText}>DEV: Plus {hasPlus ? "ON" : "OFF"}</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </CraftPanel>

        <CraftPanel texture="paper" shadow="panel" style={styles.body} contentStyle={styles.bodyContent}>
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {palettes.map((palette) => {
              const locked = isPaletteLocked(palette, hasPlus);
              return (
                <PaletteCard
                  key={palette.id}
                  name={palette.name}
                  colors={palette.colors}
                  effect={palette.effect}
                  selected={palette.id === activeId}
                  locked={locked}
                  onPress={() => handlePress(palette.id, locked)}
                />
              );
            })}
          </ScrollView>
        </CraftPanel>

        {/* Modal renders in its own native window on Android, above the
            main app tree -- the app-root ToastHost (App.tsx) is covered
            while this sheet is open, so mount a second instance here. Both
            read the same shared toast store; this one is simply the one
            actually visible whenever a toast fires while the sheet is up. */}
        <ToastHost />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#BFE0DA",
  },
  headerPanel: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 64,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: INK,
    marginRight: 12,
  },
  devButton: {
    backgroundColor: GOLD,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  devButtonText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#3D2E0F",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 14,
    fontWeight: "800",
    color: INK,
  },
  body: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  bodyContent: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-start",
    paddingVertical: 4,
  },
});
