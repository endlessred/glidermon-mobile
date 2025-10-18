import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Image as RNImage,
} from "react-native";
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  RadialGradient,
  vec,
  Image,
  useImage,
} from "@shopify/react-native-skia";
import { Card, CardType } from "../../game/harmonyDrift/types";
import { getTypeAccent, getRarityGradient, HarmonyColors, OpacityLevels } from "../../theme/harmonyPalette";
import { useTheme } from "../../data/hooks/useTheme";

export type HarmonyCardVariant = "hand" | "board";

interface HarmonyCardProps {
  data: Pick<Card, "name" | "type" | "artAsset" | "rarity" | "flavor" | "value">;
  variant: HarmonyCardVariant;
  isSelected?: boolean;
  footnote?: string;
  valueOverride?: number;
  widthOverride?: number;
  showSynergy?: boolean;
  effect?: any;
  getEffectDescription?: (effect: any) => string;
  resolveCardArt?: (asset: string, fallback: CardType) => string;
  paperTexture?: any; // Will be passed from parent
}

const TYPE_EMOJI: Record<CardType, string> = {
  Energy: "\u2600\uFE0F",
  Calm: "\uD83C\uDF0A",
  Rest: "\uD83C\uDF19",
  Nourish: "\uD83C\uDF3F",
  Anchor: "\uD83E\uDEB6",
};

const FONT_WEIGHT = {
  bold: "700" as const,
  medium: "500" as const,
};

export const HarmonyCard: React.FC<HarmonyCardProps> = ({
  data,
  variant,
  isSelected = false,
  footnote,
  valueOverride,
  widthOverride,
  showSynergy = false,
  effect,
  getEffectDescription = () => "Special effect",
  resolveCardArt = (asset: string, fallback: CardType) => TYPE_EMOJI[fallback],
  paperTexture,
}) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isNarrowScreen = screenWidth < 390;
  const handCardWidth = Math.floor((screenWidth - 80) / 4.2);

  const accent = getTypeAccent(data.type, colors.primary?.[400] || "#38bdf8");
  const baseCardWidth = widthOverride ?? (variant === "hand" ? handCardWidth : 110);
  const cardWidth = isSelected && variant === "hand" ? baseCardWidth * 1.4 : baseCardWidth;
  const baseShellHeight = variant === "hand" ? (isNarrowScreen ? 186 : 206) : 80;
  const shellHeight = isSelected && variant === "hand" ? baseShellHeight * 1.6 : baseShellHeight;

  // Art should be 60-65% of total card height as originally intended
  const artHeight = variant === "hand" ? Math.floor(shellHeight * 0.62) : Math.floor(shellHeight * 0.65);

  // Use flex for text section; keep a small cap for the collapsed state
  const collapsedTextMax = 36;
  const expandedTextMax = 64;
  const nameFont = variant === "hand" ? (isNarrowScreen ? 13 : 14) : 10;
  const flavorFont = variant === "hand" ? (isNarrowScreen ? 10 : 11) : 10;
  const value = valueOverride ?? data.value;
  const prefix = value > 0 ? "+" : "";
  const baseValue = data.value;
  const hasSynergy = showSynergy && valueOverride !== undefined && Math.abs(valueOverride) > Math.abs(baseValue);
  const valueText = variant === "hand" ? `${prefix}${Math.round(value)}` : `${prefix}${value.toFixed(1)}`;
  const artGlyph = resolveCardArt(data.artAsset, data.type);
  const isEmojiArt = typeof artGlyph === 'string';

  // Get rarity colors
  const [rarityDark, rarityLight] = getRarityGradient(data.rarity);

  // Memoized gradients for performance
  const outerGradient = useMemo(() => [rarityDark, rarityLight], [rarityDark, rarityLight]);
  const parchmentGradient = useMemo(() => [HarmonyColors.parchment.primary, HarmonyColors.parchment.primary], []);
  const artGradient = useMemo(() => [`${accent}1F`, `${accent}08`], [accent]);

  // Board cards use a completely different horizontal layout
  if (variant === "board") {
    return (
      <View
        style={[
          styles.boardCard,
          {
            width: cardWidth,
            height: shellHeight,
            transform: [{ scale: isSelected ? 1.05 : 1 }],
          },
        ]}
      >
        {/* Board card glow for selected */}
        {isSelected && (
          <View style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 12,
              backgroundColor: accent,
              opacity: 0.2,
              transform: [{ scale: 1.1 }],
            }
          ]} />
        )}

        <Canvas style={StyleSheet.absoluteFill}>
          {/* Board card background */}
          <RoundedRect x={0} y={0} width={cardWidth} height={shellHeight} r={12}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(cardWidth, shellHeight)}
              colors={[rarityDark, rarityLight]}
            />
          </RoundedRect>
          <RoundedRect x={2} y={2} width={cardWidth - 4} height={shellHeight - 4} r={10}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, shellHeight)}
              colors={[HarmonyColors.parchment.primary, HarmonyColors.parchment.secondary]}
            />
          </RoundedRect>
        </Canvas>

        {/* Paper texture overlay for board cards */}
        {paperTexture && (
          <Canvas style={StyleSheet.absoluteFill}>
            <Image
              image={paperTexture}
              x={3}
              y={3}
              width={cardWidth - 6}
              height={shellHeight - 6}
              fit="cover"
              opacity={OpacityLevels.inactive}
            />
          </Canvas>
        )}

        {/* Art-focused vertical layout for board cards */}
        <View style={styles.boardCardContent}>
          {/* Top pills container */}
          <View style={styles.boardCardTopPills}>
            {/* Type chip */}
            <View style={[styles.boardCardTypeChip, { backgroundColor: `${accent}25` }]}>
              <Text style={[styles.boardCardTypeText, { color: accent }]}>{TYPE_EMOJI[data.type]}</Text>
            </View>

            {/* Value pill */}
            <View style={[styles.boardCardValuePill, {
              backgroundColor: hasSynergy ? "#fbbf24" : accent,
              shadowColor: hasSynergy ? "#f59e0b" : "#000",
              shadowOpacity: hasSynergy ? 0.4 : 0.2,
            }]}>
              <Text style={[styles.boardCardValueText, {
                textShadowColor: hasSynergy ? "rgba(245,158,11,0.8)" : "rgba(0,0,0,0.5)"
              }]}>{valueText}</Text>
              {hasSynergy && (
                <Text style={styles.synergyIndicator}>⚡</Text>
              )}
            </View>
          </View>

          {/* Main art area */}
          <View style={styles.boardCardArtArea}>
            {isEmojiArt ? (
              <Text style={[styles.boardCardArtEmoji, { color: accent }]}>{artGlyph}</Text>
            ) : artGlyph ? (
              <RNImage
                source={artGlyph}
                style={styles.boardCardArtImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.boardCardArtEmoji, { color: accent }]}>{TYPE_EMOJI[data.type]}</Text>
            )}
          </View>
        </View>

        {/* Footnote */}
        {footnote && (
          <View style={styles.boardCardFootnote}>
            <Text style={[styles.boardCardFootnoteText, { color: accent }]} numberOfLines={1}>
              {footnote}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.cardShell,
        {
          width: cardWidth,
          height: shellHeight,
          transform: [{ scale: isSelected ? 1.05 : 1 }],
        },
      ]}
    >
      {/* Softer elliptical selection glow */}
      {isSelected && (
        <View style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 16,
            backgroundColor: accent,
            opacity: 0.14,
            transform: [{ scale: 1.08 }, { scaleY: 1.05 }],
          }
        ]} />
      )}

      {/* Layer 1: Outer frame + Layer 2: Inner panel */}
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Outer frame */}
        <RoundedRect x={0} y={0} width={cardWidth} height={shellHeight} r={16}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(cardWidth, shellHeight)}
            colors={outerGradient}
          />
        </RoundedRect>

        {/* Inner panel */}
        <RoundedRect x={3} y={3} width={cardWidth - 6} height={shellHeight - 6} r={13}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, shellHeight)}
            colors={parchmentGradient}
          />
        </RoundedRect>

        {/* Soft inner top highlight (single stroke) */}
        <RoundedRect
          x={3} y={3}
          width={cardWidth - 6}
          height={shellHeight - 6}
          r={13}
          style="stroke"
          strokeWidth={0.75}
          color={HarmonyColors.border.primary}
        />
      </Canvas>

      {/* Paper grain overlay */}
      {paperTexture && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Image
            image={paperTexture}
            x={3}
            y={3}
            width={cardWidth - 6}
            height={shellHeight - 6}
            fit="cover"
            opacity={OpacityLevels.subtle}
          />
        </Canvas>
      )}

      {/* Card content */}
      <View style={styles.cardContent}>
        {/* Layer 4: Header row (flat type chip + value gem) */}
        <View style={styles.cardHeaderNew}>
          <View style={[styles.typeChip, {
            backgroundColor: accent,
            overflow: "hidden",
          }]}>
            {/* Paper texture for type chip */}
            {paperTexture && (
              <Canvas style={StyleSheet.absoluteFill}>
                <Image
                  image={paperTexture}
                  x={0}
                  y={0}
                  width={28}
                  height={28}
                  fit="cover"
                  opacity={0.1}
                />
              </Canvas>
            )}
            <Text style={[styles.typeEmoji, {
              color: "white",
              zIndex: 1,
            }]}>{TYPE_EMOJI[data.type]}</Text>
          </View>
          <View style={[styles.valuePill, {
            backgroundColor: hasSynergy ? "#fbbf24" : accent,
            minWidth: 40,
            height: 24,
            borderRadius: 12,
            overflow: "hidden",
          }]}>
            {/* Paper texture for value pill */}
            {paperTexture && (
              <Canvas style={StyleSheet.absoluteFill}>
                <Image
                  image={paperTexture}
                  x={0}
                  y={0}
                  width={40}
                  height={24}
                  fit="cover"
                  opacity={0.1}
                />
              </Canvas>
            )}
            <Text style={[styles.valueText, {
              fontWeight: "800",
              color: "white",
              zIndex: 1,
            }]}>{valueText}</Text>
            {hasSynergy && (
              <Text style={[styles.valueBolt, {
                fontSize: 12,
                color: "white",
                marginLeft: 2,
                zIndex: 1,
              }]}>⚡</Text>
            )}
          </View>
        </View>

        {/* Layer 3: Art slot (bigger, cleaner) */}
        <View style={[styles.cardArtNew, { height: artHeight }]}>
          <Canvas style={StyleSheet.absoluteFill}>
            <RoundedRect x={6} y={6} width={cardWidth - 12} height={artHeight - 12} r={10}>
              <RadialGradient
                c={vec(cardWidth / 2, artHeight / 2)}
                r={artHeight * 0.75}
                colors={artGradient}
              />
            </RoundedRect>
          </Canvas>

          {/* Art - fills the entire art area */}
          {isEmojiArt ? (
            <Text style={[styles.cardArtEmoji, { fontSize: variant === "hand" ? (isSelected ? 56 : 40) : 32 }]}>
              {artGlyph}
            </Text>
          ) : artGlyph ? (
            <RNImage
              source={artGlyph}
              style={{
                width: cardWidth - 12, // Match the art area width (subtract padding)
                height: artHeight,
                borderRadius: 8,
                position: "absolute",
                top: 6, // Match the art area top position
                left: 6, // Match the art area left position
              }}
              resizeMode="cover"
            />
          ) : (
            <Text style={[styles.cardArtEmoji, { fontSize: variant === "hand" ? (isSelected ? 56 : 40) : 32 }]}>
              {TYPE_EMOJI[data.type]}
            </Text>
          )}

          {/* Printed title directly on card with texture */}
          <View style={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            alignItems: "center",
          }}>
            {/* Subtle texture behind title for integration */}
            {paperTexture && (
              <View style={{
                position: "absolute",
                top: -4,
                left: -20,
                right: -20,
                height: 32,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: HarmonyColors.parchment.overlay,
              }}>
                <Canvas style={StyleSheet.absoluteFill}>
                  <Image
                    image={paperTexture}
                    x={0}
                    y={0}
                    width={cardWidth}
                    height={32}
                    fit="cover"
                    opacity={OpacityLevels.medium}
                  />
                </Canvas>
              </View>
            )}
            <Text
              numberOfLines={1}
              style={{
                fontSize: nameFont,
                color: HarmonyColors.text.primary,
                fontWeight: "700",
                textAlign: "center",
                textShadowColor: HarmonyColors.parchment.overlay,
                textShadowOffset: { width: 0, height: 0.5 },
                textShadowRadius: 2,
                zIndex: 1,
              }}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {data.name}
            </Text>
          </View>
        </View>

        {/* Text section - always shows special effect layout, scaled appropriately */}
        {variant === "hand" && (effect && effect.kind !== "none" || footnote) && (
          <View style={{
            paddingHorizontal: isSelected ? 8 : 6,
            paddingVertical: isSelected ? 6 : 4,
            backgroundColor: "rgba(255,255,255,0.8)",
            borderRadius: 6,
            borderWidth: 0.5,
            borderColor: HarmonyColors.border.primary,
            justifyContent: "center",
            flexShrink: 1, // allow it to shrink to fit
            maxHeight: isSelected ? expandedTextMax : collapsedTextMax,
            overflow: "hidden",
          }}>
            {/* Paper texture overlay for text section */}
            {paperTexture && (
              <Canvas style={StyleSheet.absoluteFill}>
                <Image
                  image={paperTexture}
                  x={0}
                  y={0}
                  width={cardWidth - 12}
                  height={isSelected ? expandedTextMax : collapsedTextMax}
                  fit="cover"
                  opacity={OpacityLevels.inactive}
                />
              </Canvas>
            )}

            {/* Always show special effect format */}
            {effect && effect.kind !== "none" && (
              <View style={{ zIndex: 1 }}>
                <Text style={{
                  fontSize: isSelected ? 11 : 8,
                  fontWeight: "700",
                  color: HarmonyColors.text.special,
                  textAlign: "center",
                  marginBottom: isSelected ? 2 : 1,
                }}>
                  SPECIAL EFFECT
                </Text>
                <Text
                  style={{
                    fontSize: isSelected ? Math.max(10, flavorFont) : 8,
                    color: HarmonyColors.text.secondary,
                    textAlign: "center",
                    lineHeight: isSelected ? Math.max(12, flavorFont + 2) : 10,
                    fontWeight: "500",
                  }}
                  numberOfLines={isSelected ? 3 : 2}
                >
                  {getEffectDescription(effect)}
                </Text>
              </View>
            )}

            {/* Footnote */}
            {footnote && (
              <Text style={{
                fontSize: isSelected ? Math.max(9, flavorFont - 1) : 7,
                color: colors.text?.tertiary || HarmonyColors.text.tertiary,
                textAlign: "center",
                marginTop: (effect && effect.kind !== "none") ? (isSelected ? 3 : 2) : 0,
                fontWeight: "400",
                zIndex: 1,
              }} numberOfLines={1}>
                {footnote}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    elevation: 6,
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
    padding: 8,
    gap: 6,
    minHeight: 0, // allow children to shrink inside flex container
  },
  cardHeaderNew: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  typeChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  typeEmoji: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.bold,
  },
  valuePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
  },
  valueBolt: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
  },
  cardArtNew: {
    width: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cardArtEmoji: {
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textShadowColor: "rgba(0,0,0,0.1)",
  },
  // Board card styles
  boardCard: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 4,
  },
  boardCardContent: {
    flex: 1,
    flexDirection: "column",
    padding: 4,
  },
  boardCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 50,
  },
  boardCardTypeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  boardCardTypeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
  },
  boardCardArt: {
    fontSize: 16,
  },
  boardCardCenter: {
    flex: 1,
    paddingHorizontal: 6,
  },
  boardCardName: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: "center",
  },
  boardCardValue: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  boardCardValueText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: "#ffffff",
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
  },
  synergyIndicator: {
    fontSize: 8,
    marginLeft: 2,
  },
  boardCardFootnote: {
    position: "absolute",
    bottom: 2,
    left: 8,
    right: 8,
    alignItems: "center",
  },
  boardCardFootnoteText: {
    fontSize: 8,
    fontWeight: FONT_WEIGHT.medium,
    opacity: 0.8,
  },
  // Art-focused board card layout styles
  boardCardTopPills: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  boardCardTypeChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  boardCardValuePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  boardCardArtArea: {
    flex: 1,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  boardCardArtImage: {
    width: "100%",
    height: "100%",
  },
});