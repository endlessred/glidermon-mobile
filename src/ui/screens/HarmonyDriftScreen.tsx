import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextStyle,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../data/hooks/useTheme";
import SpineCharacterPortrait from "../components/SpineCharacterPortrait";
import { EmotionType } from "../../data/types/conversation";
import { useHarmonyDriftStore } from "../../game/harmonyDrift/store";
import { Card, CardRarity, CardType } from "../../game/harmonyDrift/types";
import { useVirtuAcornStore } from "../../data/stores/vaStore";
import { SLOT_IDS } from "../../game/harmonyDrift/layout";
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  RadialGradient,
  Path,
  Circle,
  Skia,
  vec,
} from "@shopify/react-native-skia";

type HarmonyDriftScreenProps = {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
};

type OpponentId = "luma" | "sable";

type HarmonyCardVariant = "hand" | "board";

const TYPE_EMOJI: Record<CardType, string> = {
  Energy: "\u2600\uFE0F",
  Calm: "\uD83C\uDF0A",
  Rest: "\uD83C\uDF19",
  Nourish: "\uD83C\uDF3F",
  Anchor: "\uD83E\uDEB6",
};

const CARD_ART_EMOJI: Record<string, string> = {
  "emoji:walk": "\uD83D\uDEB6",
  "emoji:alert": "\uD83D\uDCDF",
  "emoji:juice": "\uD83E\uDDC3",
  "emoji:dial": "\uD83C\uDF9B",
  "emoji:yoga": "\uD83E\uDDD8",
  "emoji:dusk": "\uD83C\uDF06",
  "emoji:snack": "\uD83C\uDF6A",
  "emoji:sleep": "\uD83D\uDE34",
  "emoji:water": "\uD83D\uDCA7",
  "emoji:note": "\uD83D\uDCDD",
  "emoji:salad": "\uD83E\uDD57",
  "emoji:sprint": "\uD83C\uDFC3",
};

const resolveCardArt = (asset: string, fallback: CardType) => CARD_ART_EMOJI[asset] ?? TYPE_EMOJI[fallback];

const SLOT_POSITIONS: Record<string, { x: number; y: number }> = {
  A1: { x: 0.16, y: 0.26 },
  A2: { x: 0.34, y: 0.18 },
  A3: { x: 0.56, y: 0.18 },
  A4: { x: 0.78, y: 0.26 },
  B1: { x: 0.14, y: 0.50 },
  B2: { x: 0.30, y: 0.40 },
  B3: { x: 0.50, y: 0.38 },
  B4: { x: 0.70, y: 0.40 },
  B5: { x: 0.86, y: 0.52 },
  C1: { x: 0.22, y: 0.78 },
  C2: { x: 0.40, y: 0.86 },
  C3: { x: 0.60, y: 0.86 },
  C4: { x: 0.78, y: 0.78 },
};

const HARMONY_MIN = -20;
const HARMONY_MAX = 20;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const typeAccent = (type: CardType, fallback: string) => {
  switch (type) {
    case "Energy":
      return "#f97316";
    case "Calm":
      return "#38bdf8";
    case "Rest":
      return "#a855f7";
    case "Nourish":
      return "#22c55e";
    case "Anchor":
      return "#facc15";
    default:
      return fallback;
  }
};

const SELECTION_META: Record<OpponentId, { title: string; tone: string; description: string }> = {
  sable: {
    title: "Sable",
    tone: "Steady partner",
    description: "Prefers calming Rest plays and gentle ripples.",
  },
  luma: {
    title: "Luma",
    tone: "Radiant companion",
    description: "Loves bold Energy surges and nourishing boosts.",
  },
};

const FONT_WEIGHT = {
  bold: "700" as TextStyle["fontWeight"],
  semibold: "600" as TextStyle["fontWeight"],
  medium: "500" as TextStyle["fontWeight"],
  regular: "400" as TextStyle["fontWeight"],
};

const rewardForResult = (
  winner: "player" | "npc" | "draw",
  playerContribution: number
) => {
  const baseWin = 60;
  const baseDraw = 40;
  const baseLoss = 25;
  const bonus = Math.max(0, Math.round(playerContribution * 8));
  if (winner === "player") return baseWin + bonus;
  if (winner === "draw") return baseDraw + Math.round(bonus / 2);
  return baseLoss;
};
export default function HarmonyDriftScreen({ navigation }: HarmonyDriftScreenProps = {}) {
  const { colors, spacing, typography } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentId | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const state = useHarmonyDriftStore((ctx) => ctx.state);
  const cards = useHarmonyDriftStore((ctx) => ctx.cards);
  const startMatch = useHarmonyDriftStore((ctx) => ctx.startMatch);
  const playPlayerCard = useHarmonyDriftStore((ctx) => ctx.playPlayerCard);
  const npcTakeTurn = useHarmonyDriftStore((ctx) => ctx.npcTakeTurn);
  const endMatch = useHarmonyDriftStore((ctx) => ctx.endMatch);

  const earnVirtuAcorns = useVirtuAcornStore((s) => s.earn);

  // Safe fallback for safe area insets
  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch {
    insets = { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const isSmallScreen = screenWidth < 350;
  const isNarrowScreen = screenWidth < 400;

  const padLg = spacing.lg ?? 16;
  const padMd = spacing.md ?? 12;
  const padSm = spacing.sm ?? 8;

  // Responsive meter sizing
  const meterWidth = Math.max(58, Math.min(68, screenWidth * 0.18));
  const meterHeight = Math.max(180, Math.min(240, screenHeight * 0.28));
  const pointerPadding = 18;

  // Improved board width calculation for small screens
  const availableBoardWidth = screenWidth - padLg * 2 - meterWidth - padLg;
  const minBoardWidth = isSmallScreen ? 240 : 280;
  const maxBoardWidth = isNarrowScreen ? 400 : 520;
  const boardWidth = Math.max(Math.min(availableBoardWidth, maxBoardWidth), minBoardWidth);
  const boardHeight = Math.min(boardWidth * 0.62, screenHeight * 0.4);

  // Responsive sizing values
  const portraitSize = isSmallScreen ? 120 : 150;
  const portraitHeight = isSmallScreen ? 160 : 200;
  const handCardWidth = isNarrowScreen ? 120 : 140;

  const opponentId = state.opponent ?? selectedOpponent ?? "sable";
  const opponentName = opponentId === "luma" ? "Luma" : "Sable";
  const selectedType = selectedCard ? cards[selectedCard]?.type : undefined;

  const [harmonyPointer, setHarmonyPointer] = useState(pointerPadding);
  const [baselinePointer, setBaselinePointer] = useState(pointerPadding);

  useEffect(() => {
    const range = HARMONY_MAX - HARMONY_MIN;
    const target = clamp(state.harmony, HARMONY_MIN, HARMONY_MAX);
    const pointerTarget = pointerPadding + (1 - (target - HARMONY_MIN) / range) * (meterHeight - pointerPadding * 2);
    setHarmonyPointer(pointerTarget);

    const baselineTarget = clamp(state.baselineHarmony, HARMONY_MIN, HARMONY_MAX);
    const baselineResult = pointerPadding + (1 - (baselineTarget - HARMONY_MIN) / range) * (meterHeight - pointerPadding * 2);
    setBaselinePointer(baselineResult);
  }, [state.harmony, state.baselineHarmony, meterHeight, pointerPadding]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (state.phase === "npcTurn") {
      timer = setTimeout(() => {
        npcTakeTurn();
      }, 650);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.phase, npcTakeTurn]);

  useEffect(() => {
    if (state.phase === "idle" && selectedOpponent) {
      startMatch(selectedOpponent);
      setRewardClaimed(false);
    }
  }, [state.phase, selectedOpponent, startMatch]);

  useEffect(() => {
    if (state.phase !== "completed") {
      setSelectedCard(null);
    }
  }, [state.phase]);

  const npcEmotion: EmotionType = useMemo(() => {
    if (state.phase === "completed" && state.result) {
      if (state.result.winner === "npc") return "Happy";
      if (state.result.winner === "player") return "Sad";
      return "Neutral";
    }
    const diff = state.playerContribution - state.npcContribution;
    if (diff > 2) return "Sad";
    if (diff < -2) return "Happy";
    return "Neutral";
  }, [state.playerContribution, state.npcContribution, state.phase, state.result]);

  const playerLeading = state.playerContribution >= state.npcContribution;
  const resultReward = state.result
    ? rewardForResult(state.result.winner, state.result.playerContribution)
    : 0;

  const handleSlotPress = (slotId: string) => {
    if (!selectedCard) return;
    // Extract the actual card ID from the unique key (format: "cardId-index")
    const actualCardId = selectedCard.split('-')[0];
    const resolution = playPlayerCard(actualCardId, slotId);
    if (resolution) setSelectedCard(null);
  };

  const handleOpponentSelect = (opponent: OpponentId) => {
    setSelectedOpponent(opponent);
  };

  const handleCollectReward = () => {
    if (!state.result || rewardClaimed) return;
    earnVirtuAcorns(resultReward, "Harmony Drift match");
    setRewardClaimed(true);
  };

  const handlePlayAgain = () => {
    endMatch();
  };

  const HarmonyCard = ({
    data,
    variant,
    isSelected = false,
    footnote,
    valueOverride,
    widthOverride,
  }: {
    data: Pick<Card, "name" | "type" | "artAsset" | "rarity" | "flavor" | "value">;
    variant: HarmonyCardVariant;
    isSelected?: boolean;
    footnote?: string;
    valueOverride?: number;
    widthOverride?: number;
  }) => {
    const accent = typeAccent(data.type, colors.primary?.[400] || "#38bdf8");
    const cardWidth = widthOverride ?? (variant === "hand" ? handCardWidth : 110);
    const shellHeight = variant === "hand" ? (isNarrowScreen ? 186 : 206) : 80; // Much shorter for board
    const artHeight = variant === "hand" ? (isNarrowScreen ? 78 : 88) : 68;
    const nameFont = variant === "hand" ? (isNarrowScreen ? 13 : 14) : 10;
    const flavorFont = variant === "hand" ? (isNarrowScreen ? 10 : 11) : 10;
    const padding = 6;
    const value = valueOverride ?? data.value;
    const prefix = value > 0 ? "+" : "";
    const valueText = variant === "hand" ? `${prefix}${Math.round(value)}` : `${prefix}${value.toFixed(1)}`;
    const artGlyph = resolveCardArt(data.artAsset, data.type);

    // Rarity colors for card borders - Harmony Drift palette
    const rarityColors = {
      Common: ["#9BBE9C", "#C7C6E6"], // Sage green to lavender mist
      Uncommon: ["#F1C27D", "#9BBE9C"], // Amber gold to sage green
      Rare: ["#C7C6E6", "#F1C27D"], // Lavender mist to amber gold
      Epic: ["#344B40", "#9BBE9C"], // Deep moss to sage green
      Legendary: ["#F1C27D", "#344B40"], // Amber gold to deep moss
    };
    const [rarityDark, rarityLight] = rarityColors[data.rarity] || rarityColors.Common;

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
                colors={["#F5F1E9", "#ffffff"]}
              />
            </RoundedRect>
          </Canvas>

          {/* Horizontal layout for board cards */}
          <View style={styles.boardCardContent}>
            {/* Left: Type icon and art */}
            <View style={styles.boardCardLeft}>
              <View style={[styles.boardCardTypeIcon, { backgroundColor: `${accent}25` }]}>
                <Text style={[styles.boardCardTypeText, { color: accent }]}>{TYPE_EMOJI[data.type]}</Text>
              </View>
              <Text style={styles.boardCardArt}>{artGlyph}</Text>
            </View>

            {/* Center: Name */}
            <View style={styles.boardCardCenter}>
              <Text
                style={[styles.boardCardName, { color: "#344B40" }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {data.name}
              </Text>
            </View>

            {/* Right: Value */}
            <View style={[styles.boardCardValue, { backgroundColor: accent }]}>
              <Text style={styles.boardCardValueText}>{valueText}</Text>
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
        {/* Outer glow for selected cards */}
        {isSelected && (
          <View style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 16,
              backgroundColor: accent,
              opacity: 0.2,
              transform: [{ scale: 1.1 }],
            }
          ]} />
        )}

        {/* Main card background with gradient border */}
        <Canvas style={StyleSheet.absoluteFill}>
          <RoundedRect x={0} y={0} width={cardWidth} height={shellHeight} r={16}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(cardWidth, shellHeight)}
              colors={[rarityDark, rarityLight]}
            />
          </RoundedRect>
          <RoundedRect x={3} y={3} width={cardWidth - 6} height={shellHeight - 6} r={13}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, shellHeight)}
              colors={["#F5F1E9", "#F1C27D08"]} // Parchment beige with subtle amber tint
            />
          </RoundedRect>

          {/* Paper texture overlay - subtle dots pattern */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Circle
              key={i}
              cx={(i * 23 + 15) % (cardWidth - 10) + 8}
              cy={15 + (Math.floor(i / 4) * 25)}
              r={0.5}
              color="rgba(52,75,64,0.06)" // Deep moss, very subtle
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <Circle
              key={`row2-${i}`}
              cx={(i * 27 + 22) % (cardWidth - 10) + 8}
              cy={shellHeight - 45 + (Math.floor(i / 3) * 15)}
              r={0.4}
              color="rgba(155,190,156,0.08)" // Sage green, very subtle
            />
          ))}

          {/* Subtle edge highlight for tactile feel */}
          <RoundedRect
            x={2} y={2}
            width={cardWidth - 4}
            height={shellHeight - 4}
            r={14}
            style="stroke"
            strokeWidth={0.5}
            color="rgba(241,194,125,0.3)" // Amber gold highlight
          />
        </Canvas>

        {/* Card content */}
        <View style={styles.cardContent}>
          {/* Header with type and value */}
          <View style={styles.cardHeaderNew}>
            <View style={[styles.cardTypeIcon, { backgroundColor: `${accent}25` }]}>
              <Text style={[styles.cardTypeIconText, { color: accent }]}>{TYPE_EMOJI[data.type]}</Text>
            </View>
            <View style={[styles.cardValueGem, { backgroundColor: accent }]}>
              <Text style={styles.cardValueGemText}>{valueText}</Text>
            </View>
          </View>

          {/* Art section with overlaid name banner */}
          <View style={[styles.cardArtNew, { height: artHeight }]}>
            <Canvas style={StyleSheet.absoluteFill}>
              <RoundedRect x={0} y={0} width={cardWidth - 12} height={artHeight} r={8}>
                <RadialGradient
                  c={vec((cardWidth - 12) / 2, artHeight / 2)}
                  r={artHeight * 0.7}
                  colors={[`${accent}15`, `${accent}08`]}
                />
              </RoundedRect>
            </Canvas>

            {/* Art emoji */}
            <Text style={[styles.cardArtEmoji, { fontSize: variant === "hand" ? 36 : 28 }]}>
              {artGlyph}
            </Text>

            {/* Ornate name banner */}
            <View style={styles.cardNameBanner}>
              <Canvas style={StyleSheet.absoluteFill}>
                {/* Main banner background */}
                <RoundedRect
                  x={6}
                  y={artHeight - 26}
                  width={cardWidth - 24}
                  height={24}
                  r={12}
                >
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(cardWidth - 24, 24)}
                    colors={["#F5F1E9", "#ffffff"]} // Parchment to white
                  />
                </RoundedRect>

                {/* Ornate border */}
                <RoundedRect
                  x={6} y={artHeight - 26}
                  width={cardWidth - 24} height={24}
                  r={12}
                  style="stroke"
                  strokeWidth={1.5}
                  color="#344B40" // Deep moss border
                />

                {/* Inner decorative line */}
                <RoundedRect
                  x={8} y={artHeight - 24}
                  width={cardWidth - 28} height={20}
                  r={10}
                  style="stroke"
                  strokeWidth={0.5}
                  color="#C7C6E6" // Lavender mist
                />

                {/* Decorative corner flourishes */}
                <Circle cx={12} cy={artHeight - 14} r={1.5} color="#F1C27D" />
                <Circle cx={cardWidth - 24} cy={artHeight - 14} r={1.5} color="#F1C27D" />

                {/* Central ornamental dot */}
                <Circle cx={cardWidth / 2 - 6} cy={artHeight - 14} r={0.8} color="#9BBE9C" />

                {/* Side decorative lines */}
                <RoundedRect
                  x={cardWidth / 2 - 18} y={artHeight - 15}
                  width={12} height={0.5}
                  r={0.25}
                  color="#F1C27D"
                  opacity={0.7}
                />
                <RoundedRect
                  x={cardWidth / 2 + 0} y={artHeight - 15}
                  width={12} height={0.5}
                  r={0.25}
                  color="#F1C27D"
                  opacity={0.7}
                />
              </Canvas>
              <Text
                style={[styles.cardNameBannerText, {
                  fontSize: nameFont,
                  lineHeight: nameFont + 2,
                  color: "#344B40", // Deep moss for high contrast
                }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {data.name}
              </Text>
            </View>
          </View>

          {/* Ornate flavor text section */}
          {variant === "hand" && data.flavor && (
            <View style={styles.cardFlavorSection}>
              <Canvas style={StyleSheet.absoluteFill}>
                {/* Ornate text background */}
                <RoundedRect x={2} y={2} width={cardWidth - 16} height={variant === "hand" ? 48 : 32} r={8}>
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(cardWidth - 16, variant === "hand" ? 48 : 32)}
                    colors={["#ffffff", "#F5F1E9"]} // White to parchment for high contrast
                  />
                </RoundedRect>

                {/* Inner ornate frame */}
                <RoundedRect
                  x={4} y={4}
                  width={cardWidth - 20}
                  height={variant === "hand" ? 44 : 28}
                  r={6}
                  style="stroke"
                  strokeWidth={1}
                  color="#C7C6E6" // Lavender mist
                />

                {/* Decorative corner elements */}
                <Circle cx={8} cy={8} r={1.5} color="#9BBE9C" />
                <Circle cx={cardWidth - 12} cy={8} r={1.5} color="#9BBE9C" />
                <Circle cx={8} cy={variant === "hand" ? 46 : 30} r={1.5} color="#9BBE9C" />
                <Circle cx={cardWidth - 12} cy={variant === "hand" ? 46 : 30} r={1.5} color="#9BBE9C" />

                {/* Central filigree line */}
                <RoundedRect
                  x={cardWidth / 2 - 15}
                  y={variant === "hand" ? 26 : 18}
                  width={30}
                  height={0.8}
                  r={0.4}
                  color="#F1C27D" // Amber gold
                  opacity={0.6}
                />

                {/* Side decorative flourishes */}
                <Circle cx={cardWidth / 2 - 22} cy={variant === "hand" ? 26 : 18} r={0.6} color="#C7C6E6" />
                <Circle cx={cardWidth / 2 + 16} cy={variant === "hand" ? 26 : 18} r={0.6} color="#C7C6E6" />
              </Canvas>

              <View style={styles.cardFlavorContent}>
                <Text
                  style={[styles.cardFlavorNew, {
                    color: "#1a1a1a", // Very dark for maximum readability
                    fontSize: flavorFont,
                    lineHeight: flavorFont + 3
                  }]}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {data.flavor}
                </Text>
              </View>
            </View>
          )}

          {/* Footnote */}
          {footnote && (
            <View style={styles.cardFootnoteSection}>
              <Text style={[styles.cardFootnoteNew, { color: colors.text?.tertiary || "#94a3b8" }]} numberOfLines={1}>
                {footnote}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  const boardCurves = useMemo(() => {
    const top = Skia.Path.Make();
    top.moveTo(boardWidth * 0.10, boardHeight * 0.30);
    top.quadTo(boardWidth * 0.50, boardHeight * 0.08, boardWidth * 0.90, boardHeight * 0.28);

    const mid = Skia.Path.Make();
    mid.moveTo(boardWidth * 0.08, boardHeight * 0.52);
    mid.quadTo(boardWidth * 0.50, boardHeight * 0.38, boardWidth * 0.92, boardHeight * 0.56);

    const low = Skia.Path.Make();
    low.moveTo(boardWidth * 0.12, boardHeight * 0.74);
    low.quadTo(boardWidth * 0.50, boardHeight * 0.92, boardWidth * 0.88, boardHeight * 0.70);

    return { top, mid, low };
  }, [boardWidth, boardHeight]);

  const renderBoard = () => {
    const accent = selectedType ? typeAccent(selectedType, colors.primary?.[400] || "#38bdf8") : colors.primary?.[400] || "#38bdf8";
    const slotWidth = Math.min(108, boardWidth * 0.20);
    const slotHeight = 90; // Fixed height that works well for horizontal board cards

    return (
      <View
        style={{ width: boardWidth, height: boardHeight, alignSelf: "center" }}
      >
        <Canvas style={StyleSheet.absoluteFillObject}>
          {/* Main board background - parchment texture */}
          <RoundedRect x={0} y={0} width={boardWidth} height={boardHeight} r={boardHeight * 0.18}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(boardWidth, boardHeight)}
              colors={["#F5F1E9", "#F1C27D15"]} // Parchment to soft amber
            />
          </RoundedRect>

          {/* Lavender vignette overlay */}
          <RoundedRect x={8} y={8} width={boardWidth - 16} height={boardHeight - 16} r={boardHeight * 0.15}>
            <RadialGradient
              c={vec(boardWidth * 0.5, boardHeight * 0.45)}
              r={boardWidth * 0.65}
              colors={["rgba(199,198,230,0.15)", "rgba(199,198,230,0.05)", "rgba(255,255,255,0)"]} // Lavender mist vignette
            />
          </RoundedRect>

          {/* Paper texture dots - subtle */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Circle
              key={i}
              cx={(i * 47 + 25) % (boardWidth - 20) + 15}
              cy={20 + (Math.floor(i / 6) * 35)}
              r={0.6}
              color="rgba(155,190,156,0.08)" // Sage green, very subtle
            />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <Circle
              key={`tex-${i}`}
              cx={(i * 53 + 40) % (boardWidth - 20) + 15}
              cy={boardHeight - 45 + (Math.floor(i / 4) * 20)}
              r={0.4}
              color="rgba(52,75,64,0.06)" // Deep moss, very subtle
            />
          ))}

          {/* Flowing energy paths - more organic curves */}
          <Path path={boardCurves.top} color="#9BBE9C" opacity={0.4} style="stroke" strokeWidth={6} strokeCap="round" />
          <Path path={boardCurves.mid} color="#C7C6E6" opacity={0.3} style="stroke" strokeWidth={4} strokeCap="round" />
          <Path path={boardCurves.low} color="#F1C27D" opacity={0.35} style="stroke" strokeWidth={5} strokeCap="round" />

          {/* Subtle border highlight */}
          <RoundedRect
            x={2} y={2}
            width={boardWidth - 4} height={boardHeight - 4}
            r={boardHeight * 0.16}
            style="stroke"
            strokeWidth={1}
            color="rgba(241,194,125,0.3)" // Amber gold highlight
          />

          {/* Corner ornaments */}
          <Circle cx={boardHeight * 0.12} cy={boardHeight * 0.12} r={3} color="#9BBE9C" opacity={0.6} />
          <Circle cx={boardWidth - boardHeight * 0.12} cy={boardHeight * 0.12} r={3} color="#9BBE9C" opacity={0.6} />
          <Circle cx={boardHeight * 0.12} cy={boardHeight - boardHeight * 0.12} r={3} color="#9BBE9C" opacity={0.6} />
          <Circle cx={boardWidth - boardHeight * 0.12} cy={boardHeight - boardHeight * 0.12} r={3} color="#9BBE9C" opacity={0.6} />
        </Canvas>
        {SLOT_IDS.map((slotId) => {
          const position = SLOT_POSITIONS[slotId];
          if (!position) return null;
          const centerX = position.x * boardWidth;
          const centerY = position.y * boardHeight;
          const left = centerX - slotWidth / 2;
          const top = centerY - slotHeight / 2;
          const occupant = state.board[slotId];
          const isPlayable = Boolean(selectedCard && !occupant && state.phase === "playerTurn");
          const ownerLabel = occupant ? (occupant.owner === "player" ? "You" : opponentName) : undefined;

          return (
            <TouchableOpacity
              key={slotId}
              activeOpacity={0.85}
              disabled={!isPlayable}
              onPress={() => {
                if (isPlayable) handleSlotPress(slotId);
              }}
              style={{ position: "absolute", left, top }}
            >
              {occupant ? (
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
                  widthOverride={slotWidth}
                  valueOverride={occupant.value}
                  footnote={ownerLabel}
                  isSelected={state.lastMove?.slotId === slotId}
                />
              ) : (
                <View
                  style={[
                    styles.emptySlot,
                    {
                      width: slotWidth,
                      height: slotHeight,
                    },
                  ]}
                >
                  <Canvas style={StyleSheet.absoluteFill}>
                    {/* Organic empty slot design */}
                    <RoundedRect x={0} y={0} width={slotWidth} height={slotHeight} r={16}>
                      <LinearGradient
                        start={vec(0, 0)}
                        end={vec(slotWidth, slotHeight)}
                        colors={
                          isPlayable
                            ? ["rgba(155,190,156,0.12)", "rgba(241,194,125,0.08)"]
                            : ["rgba(245,241,233,0.8)", "rgba(199,198,230,0.05)"]
                        }
                      />
                    </RoundedRect>

                    {/* Flowing border */}
                    <RoundedRect
                      x={2} y={2}
                      width={slotWidth - 4} height={slotHeight - 4}
                      r={14}
                      style="stroke"
                      strokeWidth={isPlayable ? 2 : 1}
                      color={isPlayable ? accent : "#C7C6E6"}
                      opacity={isPlayable ? 0.8 : 0.6}
                    />

                    {/* Inner gentle glow */}
                    <RoundedRect x={6} y={6} width={slotWidth - 12} height={slotHeight - 12} r={10}>
                      <RadialGradient
                        c={vec(slotWidth / 2 - 6, slotHeight / 2 - 6)}
                        r={slotWidth * 0.4}
                        colors={
                          isPlayable
                            ? [`${accent}15`, `${accent}05`]
                            : ["rgba(199,198,230,0.08)", "rgba(255,255,255,0)"]
                        }
                      />
                    </RoundedRect>


                    {/* Decorative elements */}
                    {isPlayable && (
                      <>
                        <Circle cx={slotWidth / 2} cy={slotHeight * 0.3} r={1.5} color={accent} opacity={0.4} />
                        <Circle cx={slotWidth / 2} cy={slotHeight * 0.7} r={1.5} color={accent} opacity={0.4} />
                      </>
                    )}

                    {/* Subtle corner ornaments */}
                    <Circle cx={12} cy={12} r={1} color="#9BBE9C" opacity={0.3} />
                    <Circle cx={slotWidth - 12} cy={12} r={1} color="#9BBE9C" opacity={0.3} />
                    <Circle cx={12} cy={slotHeight - 12} r={1} color="#9BBE9C" opacity={0.3} />
                    <Circle cx={slotWidth - 12} cy={slotHeight - 12} r={1} color="#9BBE9C" opacity={0.3} />
                  </Canvas>

                  <View style={styles.emptySlotContent}>
                    <Text style={[styles.emptySlotLabel, { color: isPlayable ? accent : "#9BBE9C" }]}>
                      Slot {slotId}
                    </Text>
                    <Text style={[styles.emptySlotHint, { color: isPlayable ? accent : "#C7C6E6" }]} numberOfLines={2}>
                      {isPlayable ? "Tap to steady" : "Awaiting play"}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };
  const renderHand = () => {
    const handCount = state.playerHand.length;
    if (handCount === 0) return null;

    // Calculate hand arc positioning
    const handWidth = Math.min(screenWidth - padLg * 2, 400);
    const cardSpacing = Math.min(handCardWidth * 0.6, (handWidth - handCardWidth) / Math.max(handCount - 1, 1));
    const maxArcAngle = Math.min(30, handCount * 4); // Max 30 degrees arc
    const arcRadius = handWidth * 1.2; // Larger radius for gentler arc

    return (
      <View style={[styles.handContainer, { width: handWidth, alignSelf: 'center' }]}>
        {state.playerHand.map((cardId, idx) => {
          const card = cards[cardId];
          if (!card) return null;

          const uniqueKey = `${cardId}-${idx}`;
          const isSelected = selectedCard === uniqueKey;
          const centerIndex = (handCount - 1) / 2;
          const offsetFromCenter = idx - centerIndex;

          // Calculate arc positioning
          const angleStep = maxArcAngle / Math.max(handCount - 1, 1);
          const rotation = offsetFromCenter * angleStep;
          const radians = (rotation * Math.PI) / 180;

          // Arc positioning - cards follow a gentle curve from bottom to top
          const baseX = idx * cardSpacing + (handWidth - (handCount - 1) * cardSpacing) / 2; // Center the hand
          const x = baseX;
          const y = -Math.abs(offsetFromCenter) * 8 + (isSelected ? -20 : 0); // Negative Y for upward arc, selected pops up more

          // Card scaling
          const scale = isSelected ? 1.0 : 0.85; // Smaller until selected
          const zIndex = isSelected ? 10 : handCount - Math.abs(offsetFromCenter);

          return (
            <TouchableOpacity
              key={uniqueKey}
              onPress={() => setSelectedCard(isSelected ? null : uniqueKey)}
              activeOpacity={0.9}
              disabled={state.phase !== "playerTurn"}
              style={[
                styles.handCardContainer,
                {
                  left: x,
                  bottom: y,
                  zIndex: zIndex,
                  transform: [
                    { translateX: -handCardWidth / 2 },
                    { rotate: `${rotation}deg` },
                    { scale: scale }
                  ],
                }
              ]}
            >
                <HarmonyCard
                  data={card}
                  variant="hand"
                  isSelected={isSelected}
                  widthOverride={handCardWidth}
                />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const range = HARMONY_MAX - HARMONY_MIN;
  const zeroBandY = pointerPadding + (1 - (0 - HARMONY_MIN) / range) * (meterHeight - pointerPadding * 2);

  const HarmonyMeter = () => (
    <View style={styles.meterColumn}>
      <Canvas style={{ width: meterWidth, height: meterHeight }}>
        <RoundedRect x={0} y={0} width={meterWidth} height={meterHeight} r={24}>
          <LinearGradient start={vec(meterWidth / 2, 0)} end={vec(meterWidth / 2, meterHeight)} colors={["#2563eb", "#34d399", "#f59e0b"]} positions={[0, 0.52, 1]} />
        </RoundedRect>
        <RoundedRect x={5} y={5} width={meterWidth - 10} height={meterHeight - 10} r={20} style="stroke" strokeWidth={1.2} color="rgba(255,255,255,0.35)" />
        <RoundedRect x={9} y={zeroBandY - 11} width={meterWidth - 18} height={22} r={11} color="rgba(255,255,255,0.15)" />
        <Circle cx={meterWidth / 2} cy={baselinePointer} r={6} color="rgba(34,197,94,0.85)" />
        <Circle cx={meterWidth / 2} cy={harmonyPointer} r={13} color="#f8fafc" />
        <Circle cx={meterWidth / 2} cy={harmonyPointer} r={8} color="#0f172a" />
      </Canvas>
      <Text style={[styles.meterValue, { color: colors.text?.primary || "#1c1917" }]}>{state.harmony.toFixed(1)}</Text>
      <Text style={[styles.meterLabel, { color: colors.text?.tertiary || "#78716c" }]}>Drift</Text>
    </View>
  );

  const renderSelection = () => (
    <View style={[styles.selectionContainer, { paddingHorizontal: padLg, paddingVertical: padLg }]}>
      <Text
        style={{
          fontSize: typography.size?.["2xl"] || 24,
          fontWeight: FONT_WEIGHT.bold,
          color: colors.text?.primary || "#1c1917",
          marginBottom: padLg,
          textAlign: "center",
        }}
      >
        Choose Your Drift Partner
      </Text>
      <View style={[styles.selectionRow, { gap: padLg }]}> 
        {(["sable", "luma"] as OpponentId[]).map((opponent) => {
          const meta = SELECTION_META[opponent];
          const isSelected = selectedOpponent === opponent;
          return (
            <TouchableOpacity
              key={opponent}
              onPress={() => handleOpponentSelect(opponent)}
              activeOpacity={0.85}
              style={[
                styles.selectionCard,
                {
                  borderColor: isSelected ? colors.primary?.[400] || "#38bdf8" : colors.gray?.[300] || "#d6d3d1",
                  backgroundColor: colors.background?.secondary || "#fbf6ec",
                },
              ]}
            >
              <View style={styles.selectionPortrait}>
                <SpineCharacterPortrait
                  character={opponent === "luma" ? "Luma" : "Sable"}
                  emotion="Neutral"
                  isActive={false}
                  size={120}
                  hideLabels
                  simple
                />
              </View>
              <Text style={[styles.selectionTitle, { color: colors.text?.primary || "#1c1917" }]}>{meta.title}</Text>
              <Text style={[styles.selectionTone, { color: colors.text?.secondary || "#44403c" }]}>{meta.tone}</Text>
              <Text style={[styles.selectionDescription, { color: colors.text?.tertiary || "#78716c" }]}>
                {meta.description}
              </Text>
              <View style={[styles.selectionButton, { backgroundColor: colors.primary?.[500] || "#0ea5e9" }]}>
                <Text style={[styles.selectionButtonText, { color: colors.background?.primary || "#ffffff" }]}>Drift Together</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
  return (
    <SafeAreaView style={styles.container}>
      <Canvas style={[StyleSheet.absoluteFillObject, { pointerEvents: "none" }]}>
        <RoundedRect x={0} y={0} width={screenWidth} height={screenHeight} r={0}>
          <LinearGradient start={vec(0, 0)} end={vec(screenWidth, screenHeight)} colors={["#f9f1e4", "#f2e5d7"]} />
        </RoundedRect>
        <Circle cx={screenWidth * 0.3} cy={screenHeight * 0.25} r={screenWidth * 0.55} color="rgba(200,176,255,0.18)" />
        <Circle cx={screenWidth * 0.78} cy={screenHeight * 0.78} r={screenWidth * 0.65} color="rgba(167,196,255,0.14)" />
      </Canvas>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: padLg,
            paddingTop: Math.max(padLg, insets.top),
            paddingBottom: Math.max(padLg, insets.bottom)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              endMatch();
              setSelectedOpponent(null);
              navigation?.goBack?.();
            }}
            activeOpacity={0.8}
            style={styles.backButton}
          >
            <Text style={{ color: colors.text?.secondary || "#57534e" }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: typography.size?.xl || 20, fontWeight: FONT_WEIGHT.bold, color: colors.text?.primary || "#1c1917" }}>
            Harmony Drift
          </Text>
        </View>

        {state.phase === "idle" && !selectedOpponent ? (
          renderSelection()
        ) : (
          <View style={{ gap: padLg }}>
            {isNarrowScreen ? (
              // Vertical layout for narrow screens
              <View style={styles.topRowVertical}>
                <View style={styles.topRowHorizontal}>
                  <View style={[styles.portraitFrame, { width: portraitSize, height: portraitHeight }]}>
                    <SpineCharacterPortrait
                      character={opponentId === "luma" ? "Luma" : "Sable"}
                      emotion={npcEmotion}
                      isActive={!playerLeading}
                      size={portraitSize}
                      hideLabels
                    />
                  </View>
                  <View style={styles.scorePanelCompact}>
                    <Text style={{ fontSize: typography.size?.xl || 20, fontWeight: FONT_WEIGHT.bold, color: colors.text?.primary || "#1c1917" }}>
                      Harmony {state.harmony.toFixed(1)}
                    </Text>
                    <Text style={{ color: colors.text?.secondary || "#44403c", fontSize: 14 }}>
                      Start: {state.baselineHarmony.toFixed(1)}
                    </Text>
                    <View style={[styles.contributionRow, { flexWrap: 'wrap', gap: 6 }]}>
                      <View style={[styles.contributionPill, { borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.12)", minWidth: 80 }]}>
                        <Text style={[styles.contributionLabel, { color: "#0f766e" }]}>You</Text>
                        <Text style={[styles.contributionValue, { color: colors.text?.primary || "#1c1917" }]}>
                          {state.playerContribution.toFixed(1)}
                        </Text>
                      </View>
                      <View style={[styles.contributionPill, { borderColor: "#a855f7", backgroundColor: "rgba(168,85,247,0.12)", minWidth: 80 }]}>
                        <Text style={[styles.contributionLabel, { color: "#6b21a8" }]}>{opponentName}</Text>
                        <Text style={[styles.contributionValue, { color: colors.text?.primary || "#1c1917" }]}>
                          {state.npcContribution.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <HarmonyMeter />
                </View>
                {state.lastMove && (
                  <View style={[styles.lastMoveBadge, { alignSelf: 'stretch', marginTop: padSm }]}>
                    <Text style={{ color: colors.text?.secondary || "#44403c", fontSize: 12, textAlign: 'center' }}>
                      Last ripple {TYPE_EMOJI[state.lastMove.card.type]} {state.lastMove.card.name} ({
                        state.lastMove.contributionDelta >= 0 ? "+" : ""
                      }
                      {state.lastMove.contributionDelta.toFixed(1)})
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              // Original horizontal layout for wider screens
              <View style={styles.topRow}>
                <View style={[styles.portraitFrame, { width: portraitSize, height: portraitHeight }]}>
                  <SpineCharacterPortrait
                    character={opponentId === "luma" ? "Luma" : "Sable"}
                    emotion={npcEmotion}
                    isActive={!playerLeading}
                    size={portraitSize}
                    hideLabels
                  />
                </View>
                <View style={styles.scorePanel}>
                  <Text style={{ fontSize: typography.size?.["2xl"] || 24, fontWeight: FONT_WEIGHT.bold, color: colors.text?.primary || "#1c1917" }}>
                    Harmony {state.harmony.toFixed(1)}
                  </Text>
                  <Text style={{ color: colors.text?.secondary || "#44403c", marginTop: padSm }}>
                    Starting drift {state.baselineHarmony.toFixed(1)}
                  </Text>
                  <View style={styles.contributionRow}>
                    <View style={[styles.contributionPill, { borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.12)" }]}>
                      <Text style={[styles.contributionLabel, { color: "#0f766e" }]}>You</Text>
                      <Text style={[styles.contributionValue, { color: colors.text?.primary || "#1c1917" }]}>
                        {state.playerContribution.toFixed(1)}
                      </Text>
                    </View>
                    <View style={[styles.contributionPill, { borderColor: "#a855f7", backgroundColor: "rgba(168,85,247,0.12)" }]}>
                      <Text style={[styles.contributionLabel, { color: "#6b21a8" }]}>{opponentName}</Text>
                      <Text style={[styles.contributionValue, { color: colors.text?.primary || "#1c1917" }]}>
                        {state.npcContribution.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  {state.lastMove && (
                    <View style={styles.lastMoveBadge}>
                      <Text style={{ color: colors.text?.secondary || "#44403c", fontSize: 12 }}>
                        Last ripple {TYPE_EMOJI[state.lastMove.card.type]} {state.lastMove.card.name} ({
                          state.lastMove.contributionDelta >= 0 ? "+" : ""
                        }
                        {state.lastMove.contributionDelta.toFixed(1)})
                      </Text>
                    </View>
                  )}
                </View>
                <HarmonyMeter />
              </View>
            )}

            <View style={styles.boardContainer}>{renderBoard()}</View>

            <View style={styles.handSection}>
              <Text
                style={{
                  fontSize: typography.size?.base || 16,
                  fontWeight: FONT_WEIGHT.semibold,
                  color: colors.text?.primary || "#1c1917",
                  marginBottom: padSm,
                  textAlign: 'center',
                }}
              >
                Your Hand
              </Text>
              {state.playerHand.length === 0 ? (
                <Text style={{ color: colors.text?.secondary || "#57534e", textAlign: 'center' }}>No cards left</Text>
              ) : (
                <View style={styles.handWrapper}>
                  {renderHand()}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {state.phase === "completed" && state.result && (
        <View style={[styles.overlay, { backgroundColor: colors.background?.overlay || "rgba(0,0,0,0.6)" }]}>
          <View style={[styles.overlayCard, { backgroundColor: colors.background?.secondary || "#fefaf5" }]}>
            <Text style={{ fontSize: 28, fontWeight: FONT_WEIGHT.bold, color: colors.text?.primary || "#1c1917", marginBottom: padMd }}>
              {state.result.winner === "player" ? "Harmony Restored" : state.result.winner === "npc" ? "Drift Tipped" : "Balanced Drift"}
            </Text>
            <Text style={{ color: colors.text?.secondary || "#44403c", marginBottom: padMd }}>
              Final Harmony {state.result.finalHarmony.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 16, color: colors.text?.primary || "#1c1917" }}>
              Reward: {resultReward} VirtuAcorns
            </Text>
            <View style={{ flexDirection: "row", gap: padMd, marginTop: padLg }}>
              <TouchableOpacity
                onPress={handleCollectReward}
                disabled={rewardClaimed}
                activeOpacity={0.85}
                style={{
                  paddingHorizontal: padLg,
                  paddingVertical: padMd,
                  borderRadius: 16,
                  backgroundColor: rewardClaimed ? colors.background?.tertiary || "#e7e5e4" : colors.primary?.[500] || "#0ea5e9",
                }}
              >
                <Text style={{ color: rewardClaimed ? colors.text?.secondary || "#44403c" : "#ffffff", fontWeight: FONT_WEIGHT.semibold }}>
                  {rewardClaimed ? "Reward Collected" : "Collect Reward"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePlayAgain}
                activeOpacity={0.85}
                style={{
                  paddingHorizontal: padLg,
                  paddingVertical: padMd,
                  borderRadius: 16,
                  backgroundColor: colors.background?.secondary || "#fbf6ec",
                  borderWidth: 1,
                  borderColor: colors.gray?.[300] || "#d6d3d1",
                }}
              >
                <Text style={{ color: colors.text?.primary || "#1c1917", fontWeight: FONT_WEIGHT.semibold }}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.08)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topRowVertical: {
    gap: 8,
  },
  topRowHorizontal: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  scorePanelCompact: {
    flex: 1,
    gap: 4,
    minWidth: 0, // Allows text to wrap
  },
  portraitFrame: {
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scorePanel: {
    flex: 1,
    gap: 8,
  },
  contributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  contributionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 124,
  },
  contributionLabel: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semibold,
  },
  contributionValue: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
  },
  lastMoveBadge: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(148,163,218,0.16)",
  },
  boardContainer: {
    alignItems: "center",
  },
  handSection: {
    marginTop: 8,
  },
  handWrapper: {
    height: 240, // Fixed height to accommodate arced cards and selected card pop-up
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  handContainer: {
    height: 220,
    position: 'relative',
  },
  handCardContainer: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    elevation: 5,
  },
  meterColumn: {
    width: 68,
    alignItems: "center",
    gap: 6,
  },
  meterValue: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.bold,
  },
  meterLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  selectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  selectionRow: {
    flexDirection: "row",
  },
  selectionCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  selectionPortrait: {
    width: 140,
    height: 160,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
  },
  selectionTone: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
  },
  selectionDescription: {
    fontSize: 12,
    textAlign: "center",
  },
  selectionButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardShell: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    elevation: 6,
  },
  cardContent: {
    flex: 1,
    padding: 6,
    paddingTop: 8,
  },
  cardHeaderNew: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  cardTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTypeIconText: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.bold,
  },
  cardValueGem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    elevation: 3,
  },
  cardValueGemText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    color: "#ffffff",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textShadowColor: "rgba(0,0,0,0.5)",
  },
  cardArtNew: {
    width: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    overflow: "hidden",
  },
  cardArtEmoji: {
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textShadowColor: "rgba(0,0,0,0.1)",
  },
  cardNameBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  cardNameBannerText: {
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
    textShadowColor: "rgba(241,194,125,0.3)", // Subtle amber glow
    letterSpacing: 0.2,
  },
  cardFlavorSection: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 50,
  },
  cardFlavorContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },
  cardFlavorNew: {
    textAlign: "center",
    fontStyle: "italic",
    fontWeight: FONT_WEIGHT.medium,
  },
  cardFootnoteSection: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    marginTop: 2,
  },
  cardFootnoteNew: {
    fontSize: 9,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: FONT_WEIGHT.semibold,
  },
  emptySlot: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    elevation: 2,
  },
  emptySlotContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  emptySlotLabel: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 4,
    textAlign: "center",
  },
  emptySlotHint: {
    fontSize: 10,
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.8,
  },
  // Board card styles - horizontal layout
  boardCard: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    elevation: 4,
  },
  boardCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  boardCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 40,
  },
  boardCardTypeIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  boardCardTypeText: {
    fontSize: 8,
    fontWeight: FONT_WEIGHT.bold,
  },
  boardCardArt: {
    fontSize: 16,
  },
  boardCardCenter: {
    flex: 1,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  boardCardName: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
    lineHeight: 11,
  },
  boardCardValue: {
    width: 24,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    elevation: 2,
  },
  boardCardValueText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    color: "#ffffff",
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
    textShadowColor: "rgba(0,0,0,0.5)",
  },
  boardCardFootnote: {
    position: "absolute",
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  boardCardFootnoteText: {
    fontSize: 7,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayCard: {
    width: "80%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
});
