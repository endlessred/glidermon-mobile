import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, SafeAreaView } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { useOutfitStore } from "../../data/stores/outfitStore";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { CosmeticSocket } from "../../data/types/outfitTypes";
import SpineCharacterPreview from "./SpineCharacterPreview";

interface OutfitEditorProps {
  outfitId: string;
  onClose: () => void;
}

type CosmeticSlot = {
  id: CosmeticSocket;
  name: string;
  icon: string;
};

const COSMETIC_SLOTS: CosmeticSlot[] = [
  { id: "headTop", name: "Head Top", icon: "🎩" },
  { id: "skin", name: "Skin", icon: "🎨" },
  { id: "face", name: "Face", icon: "😊" },
  { id: "shirt", name: "Shirt", icon: "👕" },
  { id: "jacket", name: "Jacket", icon: "🧥" },
];

export default function OutfitEditor({ outfitId, onClose }: OutfitEditorProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [selectedSlot, setSelectedSlot] = useState<CosmeticSocket | null>(null);

  const outfit = useOutfitStore(state =>
    state.slots.find(slot => slot.id === outfitId)
  );

  const equipCosmetic = useOutfitStore(state => state.equipCosmetic);
  const unequipCosmetic = useOutfitStore(state => state.unequipCosmetic);

  const { catalog: cosmeticItems, owned } = useCosmeticsStore();

  if (!outfit) {
    return (
      <SafeAreaView style={{
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
      </SafeAreaView>
    );
  }

  // Get cosmetics for the selected slot
  const getSlotCosmetics = (slot: CosmeticSocket) => {
    switch (slot) {
      case "headTop":
        // Filter for headTop/hat cosmetics from the cosmetics store that are owned
        const allHeadTop = cosmeticItems.filter(item => item.socket === "headTop");
        const ownedHeadTop = allHeadTop.filter(item => owned[item.id]);
        console.log("Debug OutfitEditor - All headTop items:", allHeadTop.map(i => i.id));
        console.log("Debug OutfitEditor - Owned items:", Object.keys(owned).filter(k => owned[k]));
        console.log("Debug OutfitEditor - Owned headTop items:", ownedHeadTop.map(i => i.id));
        return ownedHeadTop;
      case "skin":
        // Filter for skin cosmetics from the cosmetics store that are owned
        const allSkin = cosmeticItems.filter(item => item.socket === "skin");
        const ownedSkin = allSkin.filter(item => owned[item.id]);
        console.log("Debug OutfitEditor - All skin items:", allSkin.map(i => i.id));
        console.log("Debug OutfitEditor - Owned skin items:", ownedSkin.map(i => i.id));
        return ownedSkin;
      case "face":
      case "shirt":
      case "jacket":
        // For now, return empty array for unimplemented slots
        return [];
      default:
        return [];
    }
  };

  const handleEquipCosmetic = (socket: CosmeticSocket, itemId: string) => {
    equipCosmetic(outfitId, socket, itemId);
    setSelectedSlot(null);
  };

  const handleUnequipCosmetic = (socket: CosmeticSocket) => {
    unequipCosmetic(outfitId, socket);
    setSelectedSlot(null);
  };

  const getEquippedItemName = (socket: CosmeticSocket) => {
    const cosmetic = outfit.cosmetics[socket];
    if (!cosmetic?.itemId) return "None";

    const item = cosmeticItems.find(item => item.id === cosmetic.itemId);
    return item?.name || cosmetic.itemId;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
      }}>
        <Text style={{
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold as any,
          color: colors.text.primary,
        }}>
          Edit {outfit.name}
        </Text>

        <Pressable
          onPress={onClose}
          style={{
            backgroundColor: colors.gray[500],
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
          }}
        >
          <Text style={{
            color: colors.text.inverse,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.medium as any,
          }}>
            Done
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing["3xl"],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Character Preview - Centered */}
        <View style={{
          alignItems: "center",
          marginBottom: spacing.xl,
        }}>
          <SpineCharacterPreview
            outfit={outfit}
            size="large"
          />
        </View>

        {/* Cosmetic Slots */}
        <View style={{
          backgroundColor: colors.background.card,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
        }}>
          <Text style={{
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold as any,
            color: colors.text.primary,
            marginBottom: spacing.lg,
            textAlign: "center",
          }}>
            Cosmetic Slots
          </Text>

          {COSMETIC_SLOTS.map((slot) => {
            const equippedName = getEquippedItemName(slot.id);
            const slotCosmetics = getSlotCosmetics(slot.id);
            const isImplemented = slotCosmetics.length > 0;

            return (
              <Pressable
                key={slot.id}
                onPress={() => isImplemented ? setSelectedSlot(slot.id) : null}
                disabled={!isImplemented}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: isImplemented ? colors.background.secondary : colors.gray[100],
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  marginBottom: spacing.sm,
                  opacity: isImplemented ? 1 : 0.5,
                }}
              >
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                }}>
                  <Text style={{
                    fontSize: typography.size.xl,
                    marginRight: spacing.md,
                  }}>
                    {slot.icon}
                  </Text>

                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: typography.size.base,
                      fontWeight: typography.weight.medium as any,
                      color: colors.text.primary,
                      marginBottom: 2,
                    }}>
                      {slot.name}
                    </Text>

                    <Text style={{
                      fontSize: typography.size.sm,
                      color: colors.text.secondary,
                    }}>
                      {equippedName}
                    </Text>
                  </View>
                </View>

                {isImplemented && (
                  <Text style={{
                    fontSize: typography.size.sm,
                    color: colors.primary[500],
                    fontWeight: typography.weight.medium as any,
                  }}>
                    Tap to change
                  </Text>
                )}

                {!isImplemented && (
                  <Text style={{
                    fontSize: typography.size.sm,
                    color: colors.text.secondary,
                    fontStyle: "italic",
                  }}>
                    Coming soon
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Cosmetic Selection Modal */}
      <Modal
        visible={selectedSlot !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSlot(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
          {/* Modal Header */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.gray[200],
          }}>
            <Text style={{
              fontSize: typography.size.lg,
              fontWeight: typography.weight.bold as any,
              color: colors.text.primary,
            }}>
              {selectedSlot ? COSMETIC_SLOTS.find(s => s.id === selectedSlot)?.name : "Select Cosmetic"}
            </Text>

            <Pressable
              onPress={() => setSelectedSlot(null)}
              style={{
                backgroundColor: colors.gray[500],
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.md,
              }}
            >
              <Text style={{
                color: colors.text.inverse,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.medium as any,
              }}>
                Cancel
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: spacing["3xl"],
            }}
          >
            {/* None Option */}
            <Pressable
              onPress={() => selectedSlot && handleUnequipCosmetic(selectedSlot)}
              style={{
                backgroundColor: colors.background.card,
                padding: spacing.lg,
                borderRadius: borderRadius.md,
                marginBottom: spacing.md,
                borderWidth: 2,
                borderColor: selectedSlot && !outfit.cosmetics[selectedSlot]?.itemId
                  ? colors.primary[500]
                  : "transparent",
              }}
            >
              <Text style={{
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium as any,
                color: colors.text.primary,
                textAlign: "center",
              }}>
                None (Remove)
              </Text>
            </Pressable>

            {/* Cosmetic Options */}
            {selectedSlot && getSlotCosmetics(selectedSlot).map((cosmetic) => {
              const isEquipped = outfit.cosmetics[selectedSlot]?.itemId === cosmetic.id;

              // Show color indicator for recolorable items
              const getColorIndicator = () => {
                if (cosmetic.maskRecolor?.r) {
                  return (
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: cosmetic.maskRecolor.r,
                      borderWidth: 1,
                      borderColor: colors.gray[300],
                      marginLeft: spacing.sm,
                    }} />
                  );
                }
                return null;
              };

              // Show type indicator
              const getTypeIndicator = () => {
                if (cosmetic.spineSkin) {
                  return (
                    <View style={{
                      backgroundColor: colors.accent.lavender,
                      paddingHorizontal: spacing.xs,
                      paddingVertical: 2,
                      borderRadius: borderRadius.sm,
                      marginLeft: spacing.sm,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        color: colors.text.primary,
                        fontWeight: typography.weight.medium as any,
                      }}>
                        SPINE
                      </Text>
                    </View>
                  );
                } else {
                  return (
                    <View style={{
                      backgroundColor: colors.gray[300],
                      paddingHorizontal: spacing.xs,
                      paddingVertical: 2,
                      borderRadius: borderRadius.sm,
                      marginLeft: spacing.sm,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        color: colors.text.secondary,
                        fontWeight: typography.weight.medium as any,
                      }}>
                        LEGACY
                      </Text>
                    </View>
                  );
                }
              };

              return (
                <Pressable
                  key={cosmetic.id}
                  onPress={() => handleEquipCosmetic(selectedSlot, cosmetic.id)}
                  style={{
                    backgroundColor: colors.background.card,
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.md,
                    borderWidth: 2,
                    borderColor: isEquipped ? colors.primary[500] : "transparent",
                  }}
                >
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: spacing.xs,
                  }}>
                    <Text style={{
                      fontSize: typography.size.base,
                      fontWeight: typography.weight.medium as any,
                      color: colors.text.primary,
                      flex: 1,
                    }}>
                      {cosmetic.name}
                    </Text>
                    {getColorIndicator()}
                    {getTypeIndicator()}
                  </View>

                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <Text style={{
                      fontSize: typography.size.sm,
                      color: colors.text.secondary,
                    }}>
                      Cost: {cosmetic.cost} acorns
                    </Text>

                    {isEquipped && (
                      <Text style={{
                        fontSize: typography.size.sm,
                        color: colors.primary[500],
                        fontWeight: typography.weight.medium as any,
                      }}>
                        ✓ Equipped
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}