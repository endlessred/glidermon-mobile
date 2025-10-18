import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  RadialGradient,
  Circle,
  vec,
} from "@shopify/react-native-skia";
import { HarmonyCard } from "./HarmonyCard";
import { Card } from "../../game/harmonyDrift/types";
import { getTypeAccent, HarmonyColors, OpacityLevels } from "../../theme/harmonyPalette";
import { useTheme } from "../../data/hooks/useTheme";

interface BoardSlotProps {
  slotId: string;
  occupant?: any; // Board card data
  width: number;
  height: number;
  isPlayable: boolean;
  isSelected: boolean;
  ownerLabel?: string;
  previewCard?: Card;
  previewValue?: number;
  previewFootnote?: string;
  showSynergy?: boolean;
  accent?: string;
  onPress?: () => void;
}

export const BoardSlot: React.FC<BoardSlotProps> = ({
  slotId,
  occupant,
  width,
  height,
  isPlayable,
  isSelected,
  ownerLabel,
  previewCard,
  previewValue,
  previewFootnote,
  showSynergy = false,
  accent,
  onPress,
}) => {
  const { colors } = useTheme();
  const slotAccent = accent || getTypeAccent("Energy", colors.primary?.[400] || "#38bdf8");

  // If there's an occupant, show the card
  if (occupant) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!isPlayable}
        onPress={onPress}
        style={{ width, height }}
      >
        <HarmonyCard
          data={{
            name: occupant.name,
            type: occupant.type,
            artAsset: occupant.artAsset,
            rarity: occupant.rarity,
            flavor: occupant.flavor,
            value: occupant.baseValue,
          }}
          variant="board"
          widthOverride={width}
          valueOverride={occupant.value}
          footnote={ownerLabel}
          isSelected={isSelected}
          showSynergy={showSynergy}
        />
      </TouchableOpacity>
    );
  }

  // If there's a preview card, show it
  if (previewCard) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!isPlayable}
        onPress={onPress}
        style={{ width, height }}
      >
        <View style={{ opacity: 0.8, transform: [{ scale: 1.05 }] }}>
          <HarmonyCard
            data={previewCard}
            variant="board"
            widthOverride={width}
            valueOverride={previewValue}
            footnote={previewFootnote}
            isSelected={true}
            showSynergy={showSynergy}
          />
        </View>
      </TouchableOpacity>
    );
  }

  // Empty slot
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!isPlayable}
      onPress={onPress}
      style={{ width, height }}
    >
      <View style={[styles.emptySlot, { width, height }]}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Organic empty slot design */}
          <RoundedRect x={0} y={0} width={width} height={height} r={16}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, height)}
              colors={
                isPlayable
                  ? ["rgba(155,190,156,0.12)", "rgba(241,194,125,0.08)"]
                  : [HarmonyColors.parchment.overlay, "rgba(199,198,230,0.05)"]
              }
            />
          </RoundedRect>

          {/* Flowing border */}
          <RoundedRect
            x={2} y={2}
            width={width - 4} height={height - 4}
            r={14}
            style="stroke"
            strokeWidth={isPlayable ? 2 : 1}
            color={isPlayable ? slotAccent : "#C7C6E6"}
            opacity={isPlayable ? OpacityLevels.active : 0.6}
          />

          {/* Inner gentle glow */}
          <RoundedRect x={6} y={6} width={width - 12} height={height - 12} r={10}>
            <RadialGradient
              c={vec(width / 2 - 6, height / 2 - 6)}
              r={width * 0.4}
              colors={
                isPlayable
                  ? [`${slotAccent}15`, `${slotAccent}05`]
                  : ["rgba(199,198,230,0.08)", "rgba(255,255,255,0)"]
              }
            />
          </RoundedRect>

          {/* Decorative elements */}
          {isPlayable && (
            <>
              <Circle cx={width / 2} cy={height * 0.3} r={1.5} color={slotAccent} opacity={0.4} />
              <Circle cx={width / 2} cy={height * 0.7} r={1.5} color={slotAccent} opacity={0.4} />
            </>
          )}

          {/* Subtle corner ornaments */}
          <Circle cx={12} cy={12} r={1} color="#9BBE9C" opacity={0.3} />
          <Circle cx={width - 12} cy={12} r={1} color="#9BBE9C" opacity={0.3} />
          <Circle cx={12} cy={height - 12} r={1} color="#9BBE9C" opacity={0.3} />
          <Circle cx={width - 12} cy={height - 12} r={1} color="#9BBE9C" opacity={0.3} />
        </Canvas>

        <View style={styles.emptySlotContent}>
          <Text style={[styles.emptySlotLabel, { color: isPlayable ? slotAccent : "#9BBE9C" }]}>
            Slot {slotId}
          </Text>
          <Text style={[styles.emptySlotHint, { color: isPlayable ? slotAccent : "#C7C6E6" }]} numberOfLines={2}>
            {isPlayable ? "Tap to steady" : "Awaiting play"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  emptySlot: {
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    elevation: 2,
  },
  emptySlotContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptySlotLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  emptySlotHint: {
    fontSize: 8,
    fontWeight: "400",
    textAlign: "center",
    opacity: 0.8,
  },
});