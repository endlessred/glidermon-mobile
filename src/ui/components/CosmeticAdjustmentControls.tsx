// ui/components/CosmeticAdjustmentControls.tsx
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import {
  CosmeticSocket,
  UserCosmeticCustomization,
  OutfitSlot,
  PoseCosmetic,
  SkinVariation,
  EyeColor,
  ShoeVariation
} from "../../data/types/outfitTypes";
import { CosmeticDefinition } from "../../game/cosmetics/cosmeticSystem";
import { CosmeticItem, useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { SKIN_VARIATIONS, EYE_COLOR_VARIATIONS, SHOE_VARIATIONS } from "../../game/cosmetics/paletteSystem";
import { useOutfitStore } from "../../data/stores/outfitStore";
import AdjustmentSlider from "./AdjustmentSlider";

interface CosmeticAdjustmentControlsProps {
  socket: CosmeticSocket;
  outfit: OutfitSlot;
  cosmetics: CosmeticDefinition[];
  cosmeticItems?: CosmeticItem[]; // New Spine-based cosmetics
  poses: PoseCosmetic[];
  onCustomizationChange: (socket: CosmeticSocket, customization: UserCosmeticCustomization) => void;
  onResetToDefault: (socket: CosmeticSocket) => void;
  onEquipCosmetic: (socket: CosmeticSocket, itemId: string) => void;
  onUnequipCosmetic: (socket: CosmeticSocket) => void;
  onSetPose: (poseId: string) => void;
}

export default function CosmeticAdjustmentControls({
  socket,
  outfit,
  cosmetics,
  cosmeticItems = [],
  poses,
  onCustomizationChange,
  onResetToDefault,
  onEquipCosmetic,
  onUnequipCosmetic,
  onSetPose
}: CosmeticAdjustmentControlsProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [showItemSelector, setShowItemSelector] = useState(false);

  // Access cosmetics store directly to ensure we have latest data
  const { catalog: latestCosmeticItems, loadCatalog } = useCosmeticsStore();

  // Force refresh on mount to ensure we have latest cosmetics
  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Use latest cosmetic items instead of potentially stale prop
  const activeCosmeticItems = latestCosmeticItems;

  // Access outfit store for palette operations
  const setSkinVariation = useOutfitStore(s => s.setSkinVariation);
  const setEyeColor = useOutfitStore(s => s.setEyeColor);
  const setShoeVariation = useOutfitStore(s => s.setShoeVariation);
  const isSkinUnlocked = useOutfitStore(s => s.isSkinUnlocked);
  const isShoeUnlocked = useOutfitStore(s => s.isShoeUnlocked);

  // Helper functions for palette sockets
  const isPaletteSocket = (socket: CosmeticSocket): boolean => {
    return ["skinVariation", "eyeColor", "shoeVariation"].includes(socket);
  };

  const getPaletteOptions = () => {
    switch (socket) {
      case "skinVariation":
        return Object.keys(SKIN_VARIATIONS).map(key => ({
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1) + ' Skin',
          unlocked: isSkinUnlocked(key as SkinVariation),
          color: SKIN_VARIATIONS[key]?.[11] || colors.primary[100]
        }));
      case "eyeColor":
        return Object.keys(EYE_COLOR_VARIATIONS).map(key => ({
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1) + ' Eyes',
          unlocked: true, // Eyes are always unlocked
          color: EYE_COLOR_VARIATIONS[key]?.[12] || colors.primary[100]
        }));
      case "shoeVariation":
        return Object.keys(SHOE_VARIATIONS).map(key => ({
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1) + ' Shoes',
          unlocked: isShoeUnlocked(key as ShoeVariation),
          color: SHOE_VARIATIONS[key]?.[14] || colors.primary[100]
        }));
      default:
        return [];
    }
  };

  const getCurrentPaletteValue = () => {
    switch (socket) {
      case "skinVariation": return outfit.skinVariation;
      case "eyeColor": return outfit.eyeColor;
      case "shoeVariation": return outfit.shoeVariation;
      default: return "";
    }
  };

  const handlePaletteChange = (value: string) => {
    switch (socket) {
      case "skinVariation":
        setSkinVariation(outfit.id, value as SkinVariation);
        break;
      case "eyeColor":
        setEyeColor(outfit.id, value as EyeColor);
        break;
      case "shoeVariation":
        setShoeVariation(outfit.id, value as ShoeVariation);
        break;
    }
  };

  const equippedItem = outfit.cosmetics[socket];
  const currentCustomization = equippedItem?.customization;

  // Get available items for this socket
  const getAvailableItems = () => {
    if (socket === "pose") {
      return poses;
    }

    // For headTop socket, only show Spine-based cosmetics (legacy won't work with Spine character)
    if (socket === "headTop") {
      return activeCosmeticItems
        .filter(item => item.socket === socket && item.spineSkin) // Only Spine-based items
        .map(item => ({
          id: item.id,
          name: item.name,
          socket: item.socket,
          renderLayer: "headFront" as any, // Default render layer for hats
          texKey: "hatPackPng" as any, // Use thumbnail texture
          frameMode: "static" as any,
          cost: item.cost,
          spineSkin: item.spineSkin
        }));
    }

    // For other sockets, combine legacy cosmetics with new Spine-based cosmetics
    const legacyCosmetics = cosmetics.filter(item => item.socket === socket);
    const spineCosmetics = activeCosmeticItems
      .filter(item => item.socket === socket && item.spineSkin) // Only Spine-based items
      .map(item => ({
        id: item.id,
        name: item.name,
        socket: item.socket,
        renderLayer: "headFront" as any, // Default render layer for hats
        texKey: "hatPackPng" as any, // Use thumbnail texture
        frameMode: "static" as any,
        cost: item.cost,
        spineSkin: item.spineSkin
      }));

    return [...legacyCosmetics, ...spineCosmetics];
  };

  const availableItems = getAvailableItems();

  const handleAdjustmentChange = (
    property: keyof UserCosmeticCustomization["adjustments"],
    value: number | { x: number; y: number }
  ) => {
    if (!equippedItem?.itemId) return;

    const newCustomization: UserCosmeticCustomization = {
      cosmeticId: equippedItem.itemId,
      adjustments: {
        offset: currentCustomization?.adjustments.offset || { x: 0, y: 0 },
        rotation: currentCustomization?.adjustments.rotation || 0,
        scale: currentCustomization?.adjustments.scale || 1,
        layer: currentCustomization?.adjustments.layer || 0,
        ...{ [property]: value }
      }
    };

    onCustomizationChange(socket, newCustomization);
  };

  const handleItemSelect = (itemId: string) => {
    if (socket === "pose") {
      onSetPose(itemId);
    } else {
      onEquipCosmetic(socket, itemId);
    }
    setShowItemSelector(false);
  };

  if (showItemSelector) {
    return (
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[200]
        }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <Text style={{
              fontSize: typography.size.lg,
              fontWeight: typography.weight.semibold as any,
              color: colors.text.primary
            }}>
              Select {socket === "pose" ? "Pose" : "Item"}
            </Text>

            <Pressable
              onPress={() => setShowItemSelector(false)}
              style={{
                backgroundColor: colors.gray[500],
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.sm
              }}
            >
              <Text style={{
                color: colors.text.inverse,
                fontSize: typography.size.sm
              }}>
                Back
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Item List */}
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: spacing.md }}>
            {/* None option */}
            <Pressable
              onPress={() => {
                onUnequipCosmetic(socket);
                setShowItemSelector(false);
              }}
              style={{
                backgroundColor: colors.gray[100],
                padding: spacing.md,
                borderRadius: borderRadius.md,
                marginBottom: spacing.sm
              }}
            >
              <Text style={{
                fontSize: typography.size.base,
                color: colors.text.primary,
                textAlign: "center"
              }}>
                None
              </Text>
            </Pressable>

            {/* Available items */}
            {availableItems.map(item => (
              <Pressable
                key={item.id}
                onPress={() => handleItemSelect(item.id)}
                style={{
                  backgroundColor: colors.background.secondary,
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  marginBottom: spacing.sm,
                  borderWidth: equippedItem?.itemId === item.id ? 2 : 1,
                  borderColor: equippedItem?.itemId === item.id ? colors.primary[500] : colors.gray[200]
                }}
              >
                <Text style={{
                  fontSize: typography.size.base,
                  fontWeight: typography.weight.medium as any,
                  color: colors.text.primary,
                  marginBottom: spacing.xs
                }}>
                  {item.name}
                </Text>

                {item.description && (
                  <Text style={{
                    fontSize: typography.size.sm,
                    color: colors.text.secondary
                  }}>
                    {item.description}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Handle palette-based sockets
  if (isPaletteSocket(socket)) {
    const paletteOptions = getPaletteOptions();
    const currentValue = getCurrentPaletteValue();

    return (
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg }}>
          {/* Header */}
          <Text style={{
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold as any,
            color: colors.text.primary,
            marginBottom: spacing.md
          }}>
            {socket === "skinVariation" ? "Skin Color" :
             socket === "eyeColor" ? "Eye Color" :
             socket === "shoeVariation" ? "Shoe Color" : "Palette"} Settings
          </Text>

          {/* Current Selection */}
          <View style={{
            backgroundColor: colors.background.secondary,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            marginBottom: spacing.lg
          }}>
            <Text style={{
              fontSize: typography.size.base,
              fontWeight: typography.weight.medium as any,
              color: colors.text.primary,
              marginBottom: spacing.sm
            }}>
              Current Selection
            </Text>
            <Text style={{
              fontSize: typography.size.sm,
              color: colors.text.secondary,
              marginBottom: spacing.md
            }}>
              {currentValue}
            </Text>
          </View>

          {/* Palette Options */}
          <Text style={{
            fontSize: typography.size.base,
            fontWeight: typography.weight.medium as any,
            color: colors.text.primary,
            marginBottom: spacing.md
          }}>
            Available Options
          </Text>

          <View style={{ gap: spacing.md }}>
            {paletteOptions.map(option => {
              const isSelected = currentValue === option.id;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => option.unlocked && handlePaletteChange(option.id)}
                  disabled={!option.unlocked}
                  style={{
                    backgroundColor: isSelected ? colors.primary[100] : colors.background.secondary,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary[500] : colors.gray[200],
                    opacity: option.unlocked ? 1 : 0.5
                  }}
                >
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md
                  }}>
                    {/* Color preview */}
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: borderRadius.md,
                      backgroundColor: option.color,
                      borderWidth: 2,
                      borderColor: colors.gray[300],
                    }} />

                    <View>
                      <Text style={{
                        fontSize: typography.size.base,
                        fontWeight: typography.weight.medium as any,
                        color: colors.text.primary
                      }}>
                        {option.name}
                      </Text>
                      <Text style={{
                        fontSize: typography.size.sm,
                        color: option.unlocked ? colors.text.secondary : colors.text.tertiary
                      }}>
                        {option.unlocked ? "Available" : "Locked"}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View style={{
                      backgroundColor: colors.primary[500],
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      borderRadius: borderRadius.sm,
                    }}>
                      <Text style={{
                        color: colors.text.inverse,
                        fontSize: typography.size.xs,
                        fontWeight: typography.weight.medium as any
                      }}>
                        Selected
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: spacing.lg }}>
        {/* Header */}
        <Text style={{
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as any,
          color: colors.text.primary,
          marginBottom: spacing.md
        }}>
          {socket.charAt(0).toUpperCase() + socket.slice(1)} Settings
        </Text>

        {/* Item Selection */}
        <View style={{
          backgroundColor: colors.background.secondary,
          padding: spacing.md,
          borderRadius: borderRadius.md,
          marginBottom: spacing.lg
        }}>
          <Text style={{
            fontSize: typography.size.base,
            fontWeight: typography.weight.medium as any,
            color: colors.text.primary,
            marginBottom: spacing.sm
          }}>
            Current Item
          </Text>

          <Text style={{
            fontSize: typography.size.sm,
            color: colors.text.secondary,
            marginBottom: spacing.md
          }}>
            {equippedItem?.itemId || "None equipped"}
          </Text>

          <Pressable
            onPress={() => setShowItemSelector(true)}
            style={{
              backgroundColor: colors.primary[500],
              padding: spacing.sm,
              borderRadius: borderRadius.sm,
              alignItems: "center"
            }}
          >
            <Text style={{
              color: colors.text.inverse,
              fontSize: typography.size.sm,
              fontWeight: typography.weight.medium as any
            }}>
              Change Item
            </Text>
          </Pressable>
        </View>

        {/* Adjustment Controls - Only show if item is equipped */}
        {equippedItem?.itemId && socket !== "pose" && (
          <>
            <Text style={{
              fontSize: typography.size.base,
              fontWeight: typography.weight.medium as any,
              color: colors.text.primary,
              marginBottom: spacing.md
            }}>
              Positioning
            </Text>

            {/* Position Controls */}
            <View style={{
              backgroundColor: colors.background.secondary,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginBottom: spacing.md
            }}>
              <AdjustmentSlider
                label="Horizontal Offset"
                value={currentCustomization?.adjustments.offset.x || 0}
                min={-20}
                max={20}
                step={1}
                unit="px"
                onValueChange={(value) => handleAdjustmentChange("offset", {
                  x: value,
                  y: currentCustomization?.adjustments.offset.y || 0
                })}
              />

              <AdjustmentSlider
                label="Vertical Offset"
                value={currentCustomization?.adjustments.offset.y || 0}
                min={-20}
                max={20}
                step={1}
                unit="px"
                onValueChange={(value) => handleAdjustmentChange("offset", {
                  x: currentCustomization?.adjustments.offset.x || 0,
                  y: value
                })}
              />
            </View>

            {/* Rotation Control */}
            <View style={{
              backgroundColor: colors.background.secondary,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginBottom: spacing.md
            }}>
              <AdjustmentSlider
                label="Rotation"
                value={currentCustomization?.adjustments.rotation || 0}
                min={-45}
                max={45}
                step={1}
                unit="°"
                onValueChange={(value) => handleAdjustmentChange("rotation", value)}
              />
            </View>

            {/* Scale Control */}
            <View style={{
              backgroundColor: colors.background.secondary,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginBottom: spacing.md
            }}>
              <AdjustmentSlider
                label="Scale"
                value={currentCustomization?.adjustments.scale || 1}
                min={0.8}
                max={1.2}
                step={0.05}
                unit="x"
                onValueChange={(value) => handleAdjustmentChange("scale", value)}
              />
            </View>

            {/* Layer Control */}
            <View style={{
              backgroundColor: colors.background.secondary,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg
            }}>
              <AdjustmentSlider
                label="Layer Depth"
                value={currentCustomization?.adjustments.layer || 0}
                min={-5}
                max={5}
                step={1}
                unit=""
                onValueChange={(value) => handleAdjustmentChange("layer", value)}
              />
            </View>

            {/* Reset Button */}
            <Pressable
              onPress={() => onResetToDefault(socket)}
              style={{
                backgroundColor: colors.gray[500],
                padding: spacing.md,
                borderRadius: borderRadius.md,
                alignItems: "center"
              }}
            >
              <Text style={{
                color: colors.text.inverse,
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium as any
              }}>
                Reset to Default
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}