// ui/components/CosmeticAdjustmentControls.tsx
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import {
  CosmeticSocket,
  UserCosmeticCustomization,
  OutfitSlot,
  PoseCosmetic
} from "../../data/types/outfitTypes";
import { CosmeticDefinition } from "../../game/cosmetics/cosmeticSystem";
import AdjustmentSlider from "./AdjustmentSlider";

interface CosmeticAdjustmentControlsProps {
  socket: CosmeticSocket;
  outfit: OutfitSlot;
  cosmetics: CosmeticDefinition[];
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
  poses,
  onCustomizationChange,
  onResetToDefault,
  onEquipCosmetic,
  onUnequipCosmetic,
  onSetPose
}: CosmeticAdjustmentControlsProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [showItemSelector, setShowItemSelector] = useState(false);

  const equippedItem = outfit.cosmetics[socket];
  const currentCustomization = equippedItem?.customization;

  // Get available items for this socket
  const getAvailableItems = () => {
    if (socket === "pose") {
      return poses;
    }
    return cosmetics.filter(item => item.socket === socket);
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