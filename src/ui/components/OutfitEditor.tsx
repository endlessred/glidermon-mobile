import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Modal, SafeAreaView } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { useOutfitStore } from "../../data/stores/outfitStore";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { CosmeticSocket } from "../../data/types/outfitTypes";
import SpineCharacterPreview from "./SpineCharacterPreview";

// Hair color options for Windswept hair
const HAIR_COLORS = [
  { id: "blonde", name: "Blonde", color: "#f5deb3" },
  { id: "brunette", name: "Brunette", color: "#8b4513" },
  { id: "redhead", name: "Redhead", color: "#cd853f" },
  { id: "black", name: "Black", color: "#2f2f2f" },
];

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
  { id: "hair", name: "Hair", icon: "💇" },
  { id: "skin", name: "Skin", icon: "🎨" },
  { id: "face", name: "Face", icon: "😊" },
  { id: "shirt", name: "Shirt", icon: "👕" },
  { id: "jacket", name: "Jacket", icon: "🧥" },
];

export default function OutfitEditor({ outfitId, onClose }: OutfitEditorProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [selectedSlot, setSelectedSlot] = useState<CosmeticSocket | null>(null);
  const [selectedHairColor, setSelectedHairColor] = useState<string>("blonde");

  const outfit = useOutfitStore(state =>
    state.slots.find(slot => slot.id === outfitId)
  );

  const equipCosmetic = useOutfitStore(state => state.equipCosmetic);
  const equipSpineCosmetic = useOutfitStore(state => state.equipSpineCosmetic);
  const unequipCosmetic = useOutfitStore(state => state.unequipCosmetic);

  const { catalog: cosmeticItems, owned } = useCosmeticsStore();

  // Initialize hair color based on currently equipped hair
  useEffect(() => {
    if (outfit.cosmetics.hair?.spineData?.maskRecolor) {
      // Try to determine the color from the recolor data
      const recolor = outfit.cosmetics.hair.spineData.maskRecolor;
      const detectedColor = detectHairColorFromRecolor(recolor);
      if (detectedColor) {
        setSelectedHairColor(detectedColor);
      }
    }
  }, [outfit.cosmetics.hair]);

  // Helper function to detect hair color from recolor data
  const detectHairColorFromRecolor = (recolor: any): string | null => {
    const recolorStr = JSON.stringify(recolor);

    // Check against each hair color's recolor pattern
    for (const hairColor of HAIR_COLORS) {
      const expectedRecolor = getHairRecolorForColor(hairColor.id);
      const expectedStr = JSON.stringify(expectedRecolor);
      if (recolorStr === expectedStr) {
        return hairColor.id;
      }
    }

    return null; // Default if no match
  };

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
      case "hair":
        // Filter for hair cosmetics from the cosmetics store that are owned
        const allHair = cosmeticItems.filter(item => item.socket === "hair");
        const ownedHair = allHair.filter(item => owned[item.id]);
        console.log("Debug OutfitEditor - All hair items:", allHair.map(i => i.id));
        console.log("Debug OutfitEditor - Owned hair items:", ownedHair.map(i => i.id));
        return ownedHair;
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
    if (socket === "hair") {
      // For hair, we need to apply color-specific recoloring
      const hairColor = HAIR_COLORS.find(c => c.id === selectedHairColor);
      if (hairColor) {
        // Create a temporary cosmetic with the selected color recoloring
        const spineData = {
          skinName: "default", // Hair uses default skin with shader recoloring
          maskRecolor: getHairRecolorForColor(selectedHairColor)
        };
        equipSpineCosmetic(outfitId, socket, itemId, spineData);
      } else {
        equipCosmetic(outfitId, socket, itemId);
      }
    } else {
      equipCosmetic(outfitId, socket, itemId);
    }
    setSelectedSlot(null);
  };

  const handleEquipCosmeticWithColor = (socket: CosmeticSocket, itemId: string, colorId: string) => {
    if (socket === "hair") {
      // For hair, apply the specific color recoloring
      const spineData = {
        skinName: "default", // Hair uses default skin with shader recoloring
        maskRecolor: getHairRecolorForColor(colorId)
      };
      equipSpineCosmetic(outfitId, socket, itemId, spineData);
    } else {
      equipCosmetic(outfitId, socket, itemId);
    }
    // Don't close the modal so user can continue selecting colors
  };

  const getHairRecolorForColor = (colorId: string) => {
    switch (colorId) {
      case "blonde":
        return { r: "#f5deb3", g: "#fff8dc", b: "#daa520", a: "#ffff00" }; // Blonde tones
      case "brunette":
        return { r: "#8b4513", g: "#a0522d", b: "#654321", a: "#d2691e" }; // Brown tones
      case "redhead":
        return { r: "#cd853f", g: "#ff6347", b: "#b22222", a: "#ff4500" }; // Red tones
      case "black":
        return { r: "#2f2f2f", g: "#404040", b: "#1a1a1a", a: "#808080" }; // Black/gray tones
      default:
        return { r: "#f5deb3", g: "#fff8dc", b: "#daa520", a: "#ffff00" }; // Default to blonde
    }
  };

  const handleUnequipCosmetic = (socket: CosmeticSocket) => {
    unequipCosmetic(outfitId, socket);
    setSelectedSlot(null);
  };

  const getEquippedItemName = (socket: CosmeticSocket) => {
    const cosmetic = outfit.cosmetics[socket];
    if (!cosmetic?.itemId) return "None";

    const item = cosmeticItems.find(item => item.id === cosmetic.itemId);

    // For hair, show the style and current color
    if (socket === "hair" && item) {
      // Try to detect the current color from the equipped hair
      let currentColor = selectedHairColor;
      if (cosmetic.spineData?.maskRecolor) {
        const detectedColor = detectHairColorFromRecolor(cosmetic.spineData.maskRecolor);
        if (detectedColor) {
          currentColor = detectedColor;
        }
      }

      const colorName = HAIR_COLORS.find(c => c.id === currentColor)?.name || currentColor;
      return `${item.name} (${colorName})`;
    }

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

            {/* Hair Selection - Special two-step process */}
            {selectedSlot === "hair" && (
              <>
                {/* Hair Style Selection */}
                {getSlotCosmetics("hair").map((cosmetic) => {
                  const isEquipped = outfit.cosmetics.hair?.itemId === cosmetic.id;

                  return (
                    <View key={cosmetic.id} style={{ marginBottom: spacing.lg }}>
                      {/* Hair Style */}
                      <Pressable
                        onPress={() => handleEquipCosmetic("hair", cosmetic.id)}
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
                          justifyContent: "space-between",
                        }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: typography.size.base,
                              fontWeight: typography.weight.medium as any,
                              color: colors.text.primary,
                              marginBottom: spacing.xs,
                            }}>
                              {cosmetic.name}
                            </Text>
                            <Text style={{
                              fontSize: typography.size.sm,
                              color: colors.text.secondary,
                            }}>
                              Cost: {cosmetic.cost} acorns
                            </Text>
                          </View>

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

                      {/* Hair Color Selection */}
                      {isEquipped && (
                        <View style={{
                          backgroundColor: colors.background.secondary,
                          padding: spacing.md,
                          borderRadius: borderRadius.md,
                        }}>
                          <Text style={{
                            fontSize: typography.size.base,
                            fontWeight: typography.weight.medium as any,
                            color: colors.text.primary,
                            marginBottom: spacing.md,
                          }}>
                            Choose Color
                          </Text>

                          <View style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: spacing.sm,
                          }}>
                            {HAIR_COLORS.map((hairColor) => (
                              <Pressable
                                key={hairColor.id}
                                onPress={() => {
                                  setSelectedHairColor(hairColor.id);
                                  // Use the selected color directly instead of relying on state
                                  handleEquipCosmeticWithColor("hair", cosmetic.id, hairColor.id);
                                }}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  backgroundColor: selectedHairColor === hairColor.id
                                    ? colors.primary[100]
                                    : colors.background.card,
                                  padding: spacing.md,
                                  borderRadius: borderRadius.sm,
                                  borderWidth: 2,
                                  borderColor: selectedHairColor === hairColor.id
                                    ? colors.primary[500]
                                    : "transparent",
                                  minWidth: 100,
                                }}
                              >
                                <View style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 8,
                                  backgroundColor: hairColor.color,
                                  borderWidth: 1,
                                  borderColor: colors.gray[300],
                                  marginRight: spacing.sm,
                                }} />
                                <Text style={{
                                  fontSize: typography.size.sm,
                                  fontWeight: typography.weight.medium as any,
                                  color: colors.text.primary,
                                }}>
                                  {hairColor.name}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {/* Non-Hair Cosmetic Options */}
            {selectedSlot && selectedSlot !== "hair" && getSlotCosmetics(selectedSlot).map((cosmetic) => {
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