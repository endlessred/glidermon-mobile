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

  const padLg = spacing.lg ?? 16;
  const padMd = spacing.md ?? 12;
  const padSm = spacing.sm ?? 8;
  const meterWidth = 68;
  const meterHeight = Math.min(240, screenHeight * 0.28);
  const pointerPadding = 18;

  const availableBoardWidth = screenWidth - padLg * 2 - meterWidth - padLg;
  const boardWidth = Math.max(Math.min(availableBoardWidth, 520), 280);
  const boardHeight = Math.min(boardWidth * 0.62, screenHeight * 0.4);

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
    const resolution = playPlayerCard(selectedCard, slotId);
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
    const cardWidth = widthOverride ?? (variant === "hand" ? 140 : 110);
    const shellHeight = variant === "hand" ? 206 : 164;
    const artHeight = variant === "hand" ? 88 : 68;
    const nameFont = variant === "hand" ? 16 : 14;
    const padding = variant === "hand" ? padLg : Math.max(8, padMd);
    const value = valueOverride ?? data.value;
    const prefix = value > 0 ? "+" : "";
    const valueText = variant === "hand" ? `${prefix}${Math.round(value)}` : `${prefix}${value.toFixed(1)}`;
    const artGlyph = resolveCardArt(data.artAsset, data.type);

    return (
      <View
        style={[
          styles.cardShell,
          {
            width: cardWidth,
            height: shellHeight,
            padding,
            borderColor: isSelected ? accent : "#e7e0ce",
            backgroundColor: colors.background?.secondary || "#fbf6ec",
            shadowColor: accent,
            shadowOpacity: isSelected ? 0.28 : 0.16,
            elevation: isSelected ? 5 : 2,
            transform: [{ scale: isSelected ? 1.05 : 1 }],
          },
        ]}
      >
        <View style={[styles.cardHeader, { backgroundColor: `${accent}1A`, borderColor: `${accent}33` }]}>
          <Text style={[styles.cardTypeText, { color: accent }]}>{TYPE_EMOJI[data.type]}</Text>
          <View
            style={[styles.cardValueBadge, { borderColor: `${accent}AA`, backgroundColor: colors.background?.primary || "#ffffff" }]}
          >
            <Text style={[styles.cardValueText, { color: accent }]}>{valueText}</Text>
          </View>
        </View>
        <View
          style={[styles.cardArt, {
            height: artHeight,
            borderColor: `${accent}3D`,
            backgroundColor: variant === "hand" ? "rgba(255,255,255,0.18)" : "rgba(214,211,209,0.32)",
          }]}
        >
          <Text style={{ fontSize: variant === "hand" ? 40 : 32 }}>{artGlyph}</Text>
        </View>
        <View style={{ flexGrow: 1, width: "100%" }}>
          <Text style={[styles.cardName, { color: colors.text?.primary || "#1c1917", fontSize: nameFont }]} numberOfLines={2}>
            {data.name}
          </Text>
          {variant === "hand" && data.flavor && (
            <Text style={[styles.cardFlavor, { color: colors.text?.secondary || "#44403c" }]} numberOfLines={2}>
              {data.flavor}
            </Text>
          )}
        </View>
        {footnote && (
          <Text style={[styles.cardFootnote, { color: colors.text?.tertiary || "#78716c" }]} numberOfLines={1}>
            {footnote}
          </Text>
        )}
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
    const slotHeight = slotWidth * 1.42;

    return (
      <View style={{ width: boardWidth, height: boardHeight, alignSelf: "center" }}>
        <Canvas style={StyleSheet.absoluteFillObject}>
          <RoundedRect x={0} y={0} width={boardWidth} height={boardHeight} r={boardHeight * 0.18}>
            <LinearGradient start={vec(0, 0)} end={vec(boardWidth, boardHeight)} colors={["#fbf4e6", "#f2e4d3"]} />
          </RoundedRect>
          <RoundedRect x={10} y={10} width={boardWidth - 20} height={boardHeight - 20} r={boardHeight * 0.15}>
            <RadialGradient c={vec(boardWidth * 0.48, boardHeight * 0.40)} r={boardWidth * 0.62} colors={["rgba(186,154,255,0.28)", "rgba(255,255,255,0)"]} />
          </RoundedRect>
          <Path path={boardCurves.top} color="rgba(148, 163, 218, 0.35)" style="stroke" strokeWidth={7} strokeCap="round" />
          <Path path={boardCurves.mid} color="rgba(148, 163, 218, 0.22)" style="stroke" strokeWidth={5} strokeCap="round" />
          <Path path={boardCurves.low} color="rgba(148, 163, 218, 0.35)" style="stroke" strokeWidth={7} strokeCap="round" />
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
                      borderColor: isPlayable ? accent : colors.gray?.[300] || "#d6d3d1",
                      backgroundColor: colors.background?.secondary || "#fbf6ec",
                    },
                  ]}
                >
                  <Text style={{ color: colors.text?.secondary || "#57534e", fontWeight: FONT_WEIGHT.semibold, marginBottom: 6 }}>
                    Slot {slotId}
                  </Text>
                  <Text style={{ color: isPlayable ? accent : colors.text?.tertiary || "#78716c", fontSize: 12, textAlign: "center" }} numberOfLines={2}>
                    {isPlayable ? "Tap to steady" : "Awaiting play"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };
  const renderHand = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: padSm }}>
      {state.playerHand.map((cardId, idx) => {
        const card = cards[cardId];
        if (!card) return null;
        const isSelected = selectedCard === cardId;
        return (
          <TouchableOpacity
            key={`${cardId}-${idx}`}
            onPress={() => setSelectedCard(isSelected ? null : cardId)}
            activeOpacity={0.85}
            style={{ marginRight: padSm }}
          >
            <HarmonyCard data={card} variant="hand" isSelected={isSelected} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

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
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: padLg, paddingVertical: padLg }]}
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
            <View style={styles.topRow}>
              <View style={styles.portraitFrame}>
                <SpineCharacterPortrait
                  character={opponentId === "luma" ? "Luma" : "Sable"}
                  emotion={npcEmotion}
                  isActive={!playerLeading}
                  size={140}
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
                  <View style={[styles.contributionPill, { borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.12)" }]}
                  >
                    <Text style={[styles.contributionLabel, { color: "#0f766e" }]}>You</Text>
                    <Text style={[styles.contributionValue, { color: colors.text?.primary || "#1c1917" }]}>
                      {state.playerContribution.toFixed(1)}
                    </Text>
                  </View>
                  <View style={[styles.contributionPill, { borderColor: "#a855f7", backgroundColor: "rgba(168,85,247,0.12)" }]}
                  >
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

            <View style={styles.boardContainer}>{renderBoard()}</View>

            <View style={styles.handSection}>
              <Text
                style={{
                  fontSize: typography.size?.base || 16,
                  fontWeight: FONT_WEIGHT.semibold,
                  color: colors.text?.primary || "#1c1917",
                  marginBottom: padSm,
                }}
              >
                Your Hand
              </Text>
              {state.playerHand.length === 0 ? (
                <Text style={{ color: colors.text?.secondary || "#57534e" }}>No cards left</Text>
              ) : (
                renderHand()
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
  portraitFrame: {
    width: 150,
    height: 200,
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
  handSection: {},
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
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  cardHeader: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTypeText: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.bold,
  },
  cardValueBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardValueText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
  },
  cardArt: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardName: {
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 6,
    textAlign: "center",
  },
  cardFlavor: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  cardFootnote: {
    marginTop: 8,
    fontSize: 11,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptySlot: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
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
