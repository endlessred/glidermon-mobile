// ui/components/OutfitEditor.tsx
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { usePaletteUnlocks } from "../../data/hooks/usePaletteUnlocks";
import { useOutfitStore } from "../../data/stores/outfitStore";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { cosmeticSystem } from "../../game/cosmetics/cosmeticSystem";
import { CosmeticSocket, UserCosmeticCustomization } from "../../data/types/outfitTypes";
import CosmeticAdjustmentControls from "./CosmeticAdjustmentControls";
import OutfitPreview from "./OutfitPreview";

interface OutfitEditorProps {
  outfitId: string;
  onClose: () => void;
}

export default function OutfitEditor({ outfitId, onClose }: OutfitEditorProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [selectedSocket, setSelectedSocket] = useState<CosmeticSocket | null>(null);

  const outfit = useOutfitStore(state =>
    state.slots.find(slot => slot.id === outfitId)
  );

  const customizeCosmetic = useOutfitStore(state => state.customizeCosmetic);
  const resetCosmeticToDefault = useOutfitStore(state => state.resetCosmeticToDefault);
  const equipCosmetic = useOutfitStore(state => state.equipCosmetic);
  const unequipCosmetic = useOutfitStore(state => state.unequipCosmetic);
  const setPose = useOutfitStore(state => state.setPose);

  // Get cosmetics from the cosmetics store (includes Spine-based cosmetics)
  const poses = useOutfitStore(state => state.poses);
  const { catalog: cosmeticItems, loadCatalog } = useCosmeticsStore();
  const cosmetics = cosmeticSystem.getAllCosmetics(); // Keep for legacy cosmetics

  // Force refresh of catalog to ensure latest Spine hats are loaded
  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  if (!outfit) {
    return (
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background.primary
      }}>
        <Text style={{
          fontSize: typography.size.lg,
          color: colors.text.secondary
        }}>
          Outfit not found
        </Text>
      </View>
    );
  }

  const handleCustomizationChange = (socket: CosmeticSocket, customization: UserCosmeticCustomization) => {
    customizeCosmetic(outfitId, socket, customization);
  };

  const handleResetToDefault = (socket: CosmeticSocket) => {
    resetCosmeticToDefault(outfitId, socket);
  };

  const handleEquipCosmetic = (socket: CosmeticSocket, itemId: string) => {
    equipCosmetic(outfitId, socket, itemId);
  };

  const handleUnequipCosmetic = (socket: CosmeticSocket) => {
    unequipCosmetic(outfitId, socket);
  };

  const handleSetPose = (poseId: string) => {
    setPose(outfitId, poseId);
  };

  // Initialize palette unlock system
  usePaletteUnlocks();

  const sockets: CosmeticSocket[] = [
    "skinVariation", "eyeColor", "shoeVariation", // Palette-based cosmetics first
    "headTop", "headFront", "headBack", "bodyFront", "bodyBack", "hand", "waist", "pose"
  ];

  // Helper functions for palette-based sockets
  const getSocketDisplayName = (socket: CosmeticSocket): string => {
    switch (socket) {
      case "skinVariation": return "Skin Color";
      case "eyeColor": return "Eye Color";
      case "shoeVariation": return "Shoe Color";
      default: return socket.charAt(0).toUpperCase() + socket.slice(1);
    }
  };

  const getSocketStatus = (socket: CosmeticSocket): string => {
    switch (socket) {
      case "skinVariation": return outfit.skinVariation;
      case "eyeColor": return outfit.eyeColor;
      case "shoeVariation": return outfit.shoeVariation;
      default: {
        const equippedItem = outfit.cosmetics[socket];
        return equippedItem?.itemId || "Empty";
      }
    }
  };

  const isPaletteSocket = (socket: CosmeticSocket): boolean => {
    return ["skinVariation", "eyeColor", "shoeVariation"].includes(socket);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.lg,
        backgroundColor: colors.background.secondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200]
      }}>
        <Text style={{
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold as any,
          color: colors.text.primary
        }}>
          Edit: {outfit.name}
        </Text>

        <Pressable
          onPress={onClose}
          style={{
            backgroundColor: colors.gray[500],
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md
          }}
        >
          <Text style={{
            color: colors.text.inverse,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.medium as any
          }}>
            Done
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* Left Panel - Socket Selection */}
        <View style={{
          width: "30%",
          backgroundColor: colors.background.card,
          borderRightWidth: 1,
          borderRightColor: colors.gray[200]
        }}>
          <ScrollView style={{ flex: 1 }}>
            <View style={{ padding: spacing.md }}>
              <Text style={{
                fontSize: typography.size.lg,
                fontWeight: typography.weight.semibold as any,
                color: colors.text.primary,
                marginBottom: spacing.md
              }}>
                Cosmetic Slots
              </Text>

              {sockets.map(socket => {
                const isSelected = selectedSocket === socket;
                const isPalette = isPaletteSocket(socket);
                const status = getSocketStatus(socket);
                const hasItem = isPalette ? true : !!outfit.cosmetics[socket]?.itemId;

                return (
                  <Pressable
                    key={socket}
                    onPress={() => setSelectedSocket(socket)}
                    style={{
                      backgroundColor: isSelected ? colors.primary[100] : colors.background.secondary,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? colors.primary[500] : colors.gray[200]
                    }}
                  >
                    <Text style={{
                      fontSize: typography.size.base,
                      fontWeight: typography.weight.medium as any,
                      color: colors.text.primary,
                      marginBottom: spacing.xs
                    }}>
                      {getSocketDisplayName(socket)}
                    </Text>

                    <Text style={{
                      fontSize: typography.size.sm,
                      color: hasItem ? colors.health[600] : colors.text.secondary
                    }}>
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Center Panel - Live Preview */}
        <View style={{
          width: "40%",
          backgroundColor: colors.background.primary,
          justifyContent: "center",
          alignItems: "center"
        }}>
          <OutfitPreview
            outfit={outfit}
            highlightSocket={selectedSocket}
          />
        </View>

        {/* Right Panel - Customization Controls */}
        <View style={{
          width: "30%",
          backgroundColor: colors.background.card,
          borderLeftWidth: 1,
          borderLeftColor: colors.gray[200]
        }}>
          {selectedSocket ? (
            <CosmeticAdjustmentControls
              socket={selectedSocket}
              outfit={outfit}
              cosmetics={cosmetics}
              cosmeticItems={cosmeticItems}
              poses={poses}
              onCustomizationChange={handleCustomizationChange}
              onResetToDefault={handleResetToDefault}
              onEquipCosmetic={handleEquipCosmetic}
              onUnequipCosmetic={handleUnequipCosmetic}
              onSetPose={handleSetPose}
            />
          ) : (
            <View style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: spacing.lg
            }}>
              <Text style={{
                fontSize: typography.size.base,
                color: colors.text.secondary,
                textAlign: "center"
              }}>
                Select a cosmetic slot to customize
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}