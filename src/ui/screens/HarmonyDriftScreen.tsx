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
  TextInput,
  Alert,
  Animated as RNAnimated,
} from "react-native";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../data/hooks/useTheme";
import SpineCharacterPortrait from "../components/SpineCharacterPortrait";
import { EmotionType } from "../../data/types/conversation";
import { useHarmonyDriftStore } from "../../game/harmonyDrift/store";
import { Card, CardRarity, CardType, CustomDeck } from "../../game/harmonyDrift/types";
import { DECK_SIZE } from "../../game/harmonyDrift/cards";
import { useVirtuAcornStore } from "../../data/stores/vaStore";
import { SLOT_IDS } from "../../game/harmonyDrift/layout";
import { HarmonyCard } from "../components/HarmonyCard";
import { HarmonyMeter } from "../components/HarmonyMeter";
import { BoardSlot } from "../components/BoardSlot";
import { DeckSelectorModal } from "../components/DeckSelectorModal";
import { DeckBuilderModal } from "../components/DeckBuilderModal";
import { getTypeAccent, getRarityGradient, HarmonyColors, OpacityLevels } from "../../theme/harmonyPalette";
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  RadialGradient,
  Path,
  Circle,
  Skia,
  vec,
  Image,
  useImage,
} from "@shopify/react-native-skia";

type HarmonyDriftScreenProps = {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
};

type OpponentId = "luma" | "sable";


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
  "emoji:fire": "\uD83D\uDD25",
  "emoji:chaos": "\uD83C\uDF00",
  "emoji:target": "\uD83C\uDFAF",
  "emoji:lightning": "\u26A1",
  "emoji:peace": "\u262E\uFE0F",
  "emoji:domino": "\uD83C\uDFB2",
  "emoji:storm": "\u26C8\uFE0F",
  "emoji:spike": "\uD83D\uDCC8",
  "emoji:spiral": "\uD83C\uDF00",
  "emoji:breath": "\uD83D\uDCA8",
  "emoji:empty": "\uD83C\uDF7D\uFE0F",
  "emoji:muscle": "\uD83D\uDCAA",
  "emoji:clock": "\u23F0",
  "emoji:tired": "\uD83D\uDE34",
  "emoji:nap": "\uD83D\uDE34",
  "emoji:debt": "\uD83D\uDCC9",
  "emoji:recovery": "\uD83D\uDD04",
  "emoji:crash": "\uD83D\uDCA5",
  "emoji:fuel": "\u26FD",
  "emoji:wild": "\uD83C\uDCCF",
  "emoji:reset": "\uD83D\uDD04",
  "emoji:momentum": "\uD83D\uDE80",
  "emoji:shield": "\uD83D\uDEE1\uFE0F",
  "emoji:amp": "\uD83D\uDD0A",
};

// PNG Asset mapping - bundler needs explicit requires (following paperTexture pattern)
const CARD_ART_PNG: Record<string, any> = {
  "MorningWalk.png": require("../../assets/HarmonyDrift/CardArt/MorningWalk.png"),
  "DeepSleep.png": require("../../assets/HarmonyDrift/CardArt/DeepSleep.png"),
  "HeatWave.png": require("../../assets/HarmonyDrift/CardArt/HeatWave.png"),
  "AnxietySpiral.png": require("../../assets/HarmonyDrift/CardArt/AnxietySpiral.png"),
  "JuiceBox.png": require("../../assets/HarmonyDrift/CardArt/JuiceBox.png"),
};

const resolveCardArt = (asset: string, fallback: CardType) => {
  // Handle PNG assets
  if (asset.endsWith('.png')) {
    const pngAsset = CARD_ART_PNG[asset];
    if (pngAsset) {
      return pngAsset;
    } else {
      console.warn(`PNG asset not found: ${asset}`);
      return TYPE_EMOJI[fallback];
    }
  }
  // Handle emoji assets
  return CARD_ART_EMOJI[asset] ?? TYPE_EMOJI[fallback];
};

// Helper functions for consistent key handling - safe from dash conflicts
// Note: These will be properly initialized inside the component with useRef

// Animated Hand Card Component to handle breathing animation
const AnimatedHandCard: React.FC<{
  card: Card;
  isSelected: boolean;
  uniqueKey: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
  handCardWidth: number;
  onPress: () => void;
  disabled: boolean;
  getEffectDescription: (effect: any) => string;
}> = ({ card, isSelected, uniqueKey, x, y, rotation, scale, zIndex, handCardWidth, onPress, disabled, getEffectDescription }) => {
  // Breathing animation for selected card
  const breathingScale = React.useRef(new RNAnimated.Value(1)).current;

  React.useEffect(() => {
    console.log('Breathing animation effect - isSelected:', isSelected, 'cardId:', card.id);
    try {
      if (isSelected) {
        console.log('Starting breathing animation for:', card.id);
        const breathingLoop = RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.timing(breathingScale, {
              toValue: 1.05,
              duration: 1500,
              useNativeDriver: true,
            }),
            RNAnimated.timing(breathingScale, {
              toValue: 1.0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        );
        breathingLoop.start();
        console.log('Breathing animation started successfully for:', card.id);
        return () => {
          console.log('Cleaning up breathing animation for:', card.id);
          breathingLoop.stop();
        };
      } else {
        console.log('Stopping breathing animation for:', card.id);
        breathingScale.setValue(1);
      }
    } catch (error) {
      console.error('Error in breathing animation for card:', card.id, error);
    }
  }, [isSelected, card.id, breathingScale]);

  return (
    <TouchableOpacity
      key={uniqueKey}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
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
      <RNAnimated.View
        style={{
          transform: [{ scale: breathingScale }]
        }}
      >
        {(() => {
          console.log('About to render HarmonyCard for:', card.id, 'isSelected:', isSelected);
          return (
            <HarmonyCard
              data={card}
              variant="hand"
              isSelected={isSelected}
              widthOverride={handCardWidth}
              effect={card.effect}
              getEffectDescription={getEffectDescription}
              resolveCardArt={resolveCardArt}
            />
          );
        })()}
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

// Normalize rarity for gradient lookups
const normalizeRarity = (r?: string) => {
  if (!r) return "Common";
  const v = r.toLowerCase();
  if (v === "uncommon") return "Uncommon";
  if (v === "rare") return "Rare";
  if (v === "epic") return "Epic";
  if (v === "legendary") return "Legendary";
  return "Common";
};

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

  // Global paper texture for consistent usage across components
  const paperTexture = useImage(require("../../assets/HarmonyDrift/PaperTex.jpg"));

  // Safe key mapping to avoid ID parsing issues with dashes
  const handKeyToId = React.useRef<Record<string, string>>({});
  const makeHandKey = (id: string, index: number) => {
    const key = `${id}__IDX__${index}`; // safe delimiter
    handKeyToId.current[key] = id;
    return key;
  };
  const keyToId = (key: string) => handKeyToId.current[key] ?? key; // fallback
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentId | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [previewSlot, setPreviewSlot] = useState<string | null>(null);
  const [npcPreview, setNpcPreview] = useState<{ cardId: string; slotId: string } | null>(null);
  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [editingDeck, setEditingDeck] = useState<CustomDeck | null>(null);
  const [builderCards, setBuilderCards] = useState<string[]>([]);
  const [builderName, setBuilderName] = useState("");

  const state = useHarmonyDriftStore((ctx) => ctx.state);
  const cards = useHarmonyDriftStore((ctx) => ctx.cards);
  const startMatch = useHarmonyDriftStore((ctx) => ctx.startMatch);
  const playPlayerCard = useHarmonyDriftStore((ctx) => ctx.playPlayerCard);
  const npcTakeTurn = useHarmonyDriftStore((ctx) => ctx.npcTakeTurn);
  const endMatch = useHarmonyDriftStore((ctx) => ctx.endMatch);
  const previewPlacement = useHarmonyDriftStore((ctx) => ctx.previewPlacement);
  const deckCollection = useHarmonyDriftStore((ctx) => ctx.deckCollection);
  const setActiveDeck = useHarmonyDriftStore((ctx) => ctx.setActiveDeck);
  const createDeck = useHarmonyDriftStore((ctx) => ctx.createDeck);
  const updateDeck = useHarmonyDriftStore((ctx) => ctx.updateDeck);
  const deleteDeck = useHarmonyDriftStore((ctx) => ctx.deleteDeck);

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
  // Normalize selectedCard key to actual card ID for lookups
  const realSelectedCardId = useMemo(() => {
    console.log('realSelectedCardId useMemo start - selectedCard:', selectedCard);
    if (!selectedCard) {
      console.log('realSelectedCardId: selectedCard is null, returning null');
      return null;
    }
    const realId = keyToId(selectedCard);
    console.log('realSelectedCardId calculation - selectedCard:', selectedCard, 'realId:', realId);
    return realId;
  }, [selectedCard]);

  console.log('About to calculate selectedType - realSelectedCardId:', realSelectedCardId);
  console.log('cards object keys:', Object.keys(cards).slice(0, 5), '...');
  console.log('cards[realSelectedCardId]:', realSelectedCardId ? cards[realSelectedCardId] : 'N/A');

  const selectedType = realSelectedCardId ? cards[realSelectedCardId]?.type : undefined;
  console.log('selectedType calculation - realSelectedCardId:', realSelectedCardId, 'selectedType:', selectedType);

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

  // Helper function to find best NPC move
  const findBestNpcMove = () => {
    let best: { cardId: string; slotId: string; score: number; stability: number } | undefined;

    state.npcHand.forEach((cardId) => {
      SLOT_IDS.forEach((slotId) => {
        if (state.board[slotId]) return;
        const preview = previewPlacement(cardId, slotId);
        if (!preview) return;

        const score = preview.contributionDelta;
        const stability = Math.abs(preview.harmonyAfter);

        if (!best) {
          best = { cardId, slotId, score, stability };
          return;
        }
        if (score > best.score || (score === best.score && stability < best.stability)) {
          best = { cardId, slotId, score, stability };
        }
      });
    });

    return best;
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (state.phase === "npcTurn") {
      // First show NPC preview
      const bestMove = findBestNpcMove();
      if (bestMove) {
        setNpcPreview({ cardId: bestMove.cardId, slotId: bestMove.slotId });

        // After 1 second, make the actual move
        timer = setTimeout(() => {
          setNpcPreview(null);
          npcTakeTurn();
        }, 1000);
      } else {
        // No valid move
        timer = setTimeout(() => {
          npcTakeTurn();
        }, 650);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.phase, npcTakeTurn, previewPlacement]);

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

    // If this slot is already being previewed, place the card
    if (previewSlot === slotId) {
      const actualCardId = keyToId(selectedCard);
      const resolution = playPlayerCard(actualCardId, slotId);
      if (resolution) {
        setSelectedCard(null);
        setPreviewSlot(null);
      }
    } else {
      // First tap - show preview
      setPreviewSlot(slotId);
    }
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

  // Calculate preview for current selected card + slot combination
  const currentPreview = useMemo(() => {
    console.log('currentPreview useMemo - selectedCard:', selectedCard, 'previewSlot:', previewSlot, 'phase:', state.phase);
    if (!selectedCard || !previewSlot || state.phase !== "playerTurn") {
      console.log('currentPreview: early return null');
      return null;
    }
    const actualCardId = keyToId(selectedCard);
    console.log('currentPreview: actualCardId:', actualCardId);
    try {
      const result = previewPlacement(actualCardId, previewSlot);
      console.log('currentPreview: previewPlacement success');
      return result;
    } catch (e) {
      console.warn('Preview placement failed for card:', actualCardId, 'slot:', previewSlot, e);
      return null;
    }
  }, [selectedCard, previewSlot, state.phase, previewPlacement]);

  // Calculate NPC preview
  const npcPreviewData = useMemo(() => {
    if (!npcPreview) return null;
    try {
      return previewPlacement(npcPreview.cardId, npcPreview.slotId);
    } catch (e) {
      console.warn('NPC preview placement failed for card:', npcPreview.cardId, 'slot:', npcPreview.slotId, e);
      return null;
    }
  }, [npcPreview, previewPlacement]);

  // Clear preview when no card is selected
  useEffect(() => {
    if (!selectedCard) {
      setPreviewSlot(null);
    }
  }, [selectedCard]);

  // Helper function to generate readable effect descriptions
  const getEffectDescription = (effect: any) => {
    if (!effect || effect.kind === "none") return "No special effect.";

    switch (effect.kind) {
      case "adjacentModify":
        return `${effect.delta > 0 ? "Boosts" : "Reduces"} adjacent cards by ${Math.abs(effect.delta)}.`;
      case "typeModify":
        return `${effect.delta > 0 ? "Boosts" : "Reduces"} all ${effect.targetType} cards by ${Math.abs(effect.delta)}.`;
      case "globalScale":
        const percent = Math.round((1 - effect.factor) * 100);
        return `${effect.factor < 1 ? "Reduces" : "Amplifies"} all card effects by ${Math.abs(percent)}%.`;
      case "pattern":
        return `Affects cards in a specific pattern by ${effect.delta > 0 ? "+" : ""}${effect.delta}.`;
      case "adjacentScale":
        const adjPercent = Math.round((effect.factor - 1) * 100);
        return `${effect.factor > 1 ? "Amplifies" : "Reduces"} adjacent cards by ${Math.abs(adjPercent)}%.`;
      case "radiusModify":
        return `Affects all cards within ${effect.radius} spaces by ${effect.delta > 0 ? "+" : ""}${effect.delta}.`;
      case "conditionalModify":
        if (effect.condition === "adjacentCount") {
          return `Gains ${effect.delta > 0 ? "+" : ""}${effect.delta} for each adjacent card.`;
        }
        return "Special conditional effect.";
      case "harmonyShift":
        return `Shifts harmony by ${effect.harmonyDelta > 0 ? "+" : ""}${effect.harmonyDelta} (doesn't affect your score).`;
      default:
        return "Unknown effect.";
    }
  };

  // Helper function to check if a card has synergy with neighbors
  const checkCardSynergy = (slotId: string, board: Record<string, any>) => {
    const card = board[slotId];
    if (!card) return false;

    const slot = SLOT_IDS.find(id => id === slotId);
    if (!slot) return false;

    // Import the slot map to get neighbors
    const slotData = {
      A1: ["A2", "B1", "B2"],
      A2: ["A1", "A3", "B2", "B3"],
      A3: ["A2", "A4", "B3", "B4"],
      A4: ["A3", "B4", "B5"],
      B1: ["B2", "A1", "C1", "C2"],
      B2: ["B1", "B3", "A1", "A2", "C1", "C2"],
      B3: ["B2", "B4", "A2", "A3", "C2", "C3"],
      B4: ["B3", "B5", "A3", "A4", "C3", "C4"],
      B5: ["B4", "A4", "C4"],
      C1: ["C2", "B1", "B2"],
      C2: ["C1", "C3", "B1", "B2", "B3"],
      C3: ["C2", "C4", "B2", "B3", "B4"],
      C4: ["C3", "B3", "B4", "B5"],
    };

    const neighbors = slotData[slotId as keyof typeof slotData] || [];
    return neighbors.some(neighborId => {
      const neighbor = board[neighborId];
      return neighbor && neighbor.type === card.type;
    });
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

  // Memoized gradients for board background for performance
  const boardBackgroundGradient = useMemo(() =>
    [HarmonyColors.parchment.primary, "#f2e5d7"],
    []
  );

  const boardMainGradient = useMemo(() =>
    ["#faf8f5", "#f7f5f3"],
    []
  );

  const renderBoard = () => {
    console.log('renderBoard start - selectedType:', selectedType);
    const accent = selectedType ? getTypeAccent(selectedType, colors.primary?.[400] || "#38bdf8") : colors.primary?.[400] || "#38bdf8";
    console.log('renderBoard accent calculated:', accent);
    const slotWidth = Math.min(108, boardWidth * 0.20);
    const slotHeight = 90; // Fixed height that works well for horizontal board cards

    return (
      <View
        style={{ width: boardWidth, height: boardHeight, alignSelf: "center" }}
      >
        <Canvas style={StyleSheet.absoluteFillObject}>
          {/* Combined board background and vignette */}
          <RoundedRect x={0} y={0} width={boardWidth} height={boardHeight} r={boardHeight * 0.18}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(boardWidth, boardHeight)}
              colors={boardBackgroundGradient}
            />
          </RoundedRect>

          {/* Paper texture overlay from global texture */}
          {paperTexture && (
            <Image
              image={paperTexture}
              x={8}
              y={8}
              width={boardWidth - 16}
              height={boardHeight - 16}
              fit="cover"
              opacity={OpacityLevels.inactive}
            />
          )}

          {/* Flowing energy paths - memoized curves */}
          <Path path={boardCurves.top} color={HarmonyColors.nature.sage} opacity={OpacityLevels.subtle} style="stroke" strokeWidth={6} strokeCap="round" />
          <Path path={boardCurves.mid} color={HarmonyColors.nature.lavender} opacity={OpacityLevels.subtle} style="stroke" strokeWidth={4} strokeCap="round" />
          <Path path={boardCurves.low} color={HarmonyColors.nature.amber} opacity={OpacityLevels.subtle} style="stroke" strokeWidth={5} strokeCap="round" />

          {/* Subtle border highlight */}
          <RoundedRect
            x={2} y={2}
            width={boardWidth - 4} height={boardHeight - 4}
            r={boardHeight * 0.16}
            style="stroke"
            strokeWidth={1}
            color={HarmonyColors.nature.amber}
            opacity={OpacityLevels.subtle}
          />

          {/* Corner ornaments */}
          <Circle cx={boardHeight * 0.12} cy={boardHeight * 0.12} r={3} color={HarmonyColors.nature.sage} opacity={OpacityLevels.moderate} />
          <Circle cx={boardWidth - boardHeight * 0.12} cy={boardHeight * 0.12} r={3} color={HarmonyColors.nature.sage} opacity={OpacityLevels.moderate} />
          <Circle cx={boardHeight * 0.12} cy={boardHeight - boardHeight * 0.12} r={3} color={HarmonyColors.nature.sage} opacity={OpacityLevels.moderate} />
          <Circle cx={boardWidth - boardHeight * 0.12} cy={boardHeight - boardHeight * 0.12} r={3} color={HarmonyColors.nature.sage} opacity={OpacityLevels.moderate} />
        </Canvas>
        {SLOT_IDS.map((slotId) => {
          console.log('Rendering board slot:', slotId);
          const position = SLOT_POSITIONS[slotId];
          if (!position) {
            console.log('No position for slot:', slotId);
            return null;
          }
          const centerX = position.x * boardWidth;
          const centerY = position.y * boardHeight;
          const left = centerX - slotWidth / 2;
          const top = centerY - slotHeight / 2;
          const occupant = state.board[slotId];
          const isPlayable = Boolean(selectedCard && !occupant && state.phase === "playerTurn");
          console.log('Slot', slotId, '- occupant:', !!occupant, 'isPlayable:', isPlayable);
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
                  showSynergy={checkCardSynergy(slotId, state.board)}
                  resolveCardArt={resolveCardArt}
                />
              ) : previewSlot === slotId && selectedCard ? (
                (() => {
                  console.log('About to render preview slot for:', slotId);
                  console.log('realSelectedCardId:', realSelectedCardId);
                  console.log('cards[realSelectedCardId]:', cards[realSelectedCardId]);
                  console.log('currentPreview:', currentPreview);

                  const cardData = cards[realSelectedCardId];
                  if (!cardData) {
                    console.log('No card data found for:', realSelectedCardId);
                    return null;
                  }

                  console.log('Card data found, about to create preview');
                  try {
                    const previewData = {
                      name: cardData.name || "",
                      type: cardData.type || "Energy",
                      artAsset: cardData.artAsset || "",
                      rarity: normalizeRarity(cardData.rarity),
                      flavor: cardData.flavor || "",
                      value: cardData.value || 0,
                    };
                    console.log('Preview data created:', previewData);

                    return (
                      <View style={{ opacity: 0.8, transform: [{ scale: 1.05 }] }}>
                        <HarmonyCard
                          data={previewData}
                          variant="board"
                          widthOverride={slotWidth}
                          valueOverride={currentPreview?.board[slotId]?.value}
                          footnote="Preview"
                          isSelected={true}
                          showSynergy={currentPreview ? checkCardSynergy(slotId, currentPreview.board) : false}
                          resolveCardArt={resolveCardArt}
                        />
                      </View>
                    );
                  } catch (e) {
                    console.error('Error creating preview card:', e);
                    return null;
                  }
                })()
              ) : npcPreview && npcPreview.slotId === slotId ? (
                (() => {
                  console.log('About to render NPC preview slot for:', slotId);
                  console.log('npcPreview.cardId:', npcPreview.cardId);
                  console.log('cards[npcPreview.cardId]:', cards[npcPreview.cardId]);

                  const npcCardData = cards[npcPreview.cardId];
                  if (!npcCardData) {
                    console.log('No NPC card data found for:', npcPreview.cardId);
                    return null;
                  }

                  console.log('NPC card data found, about to create NPC preview');
                  try {
                    return (
                      <View style={{ opacity: 0.7, transform: [{ scale: 1.03 }] }}>
                        <HarmonyCard
                          data={{
                            name: npcCardData.name || "",
                            type: npcCardData.type || "Energy",
                            artAsset: npcCardData.artAsset || "",
                            rarity: normalizeRarity(npcCardData.rarity),
                            flavor: npcCardData.flavor || "",
                            value: npcCardData.value || 0,
                          }}
                          variant="board"
                          widthOverride={slotWidth}
                          valueOverride={npcPreviewData?.board[slotId]?.value}
                          footnote={`${opponentName} thinking...`}
                          isSelected={false}
                          showSynergy={npcPreviewData ? checkCardSynergy(slotId, npcPreviewData.board) : false}
                          resolveCardArt={resolveCardArt}
                        />
                      </View>
                    );
                  } catch (e) {
                    console.error('Error creating NPC preview card:', e);
                    return null;
                  }
                })()
              ) : (
                (() => {
                  console.log('About to render empty slot for:', slotId);
                  try {
                    return (
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
                        <Circle cx={slotWidth / 2} cy={slotHeight * 0.3} r={1.5} color={accent} opacity={OpacityLevels.subtle} />
                        <Circle cx={slotWidth / 2} cy={slotHeight * 0.7} r={1.5} color={accent} opacity={OpacityLevels.subtle} />
                      </>
                    )}

                    {/* Subtle corner ornaments */}
                    <Circle cx={12} cy={12} r={1} color={HarmonyColors.nature.sage} opacity={OpacityLevels.minimal} />
                    <Circle cx={slotWidth - 12} cy={12} r={1} color={HarmonyColors.nature.sage} opacity={OpacityLevels.minimal} />
                    <Circle cx={12} cy={slotHeight - 12} r={1} color={HarmonyColors.nature.sage} opacity={OpacityLevels.minimal} />
                    <Circle cx={slotWidth - 12} cy={slotHeight - 12} r={1} color={HarmonyColors.nature.sage} opacity={OpacityLevels.minimal} />
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
                    );
                  } catch (e) {
                    console.error('Error creating empty slot:', e);
                    return <View style={{ width: slotWidth, height: slotHeight, backgroundColor: 'red' }} />;
                  }
                })()
              )}
            </TouchableOpacity>
          );
        }).map((slot, index) => {
          console.log('Slot render completed for index:', index);
          return slot;
        })}
      </View>
    );
  };

  // Animation removed to isolate crash issue

  // Harmony meter pulse animation - this was working fine
  const harmonyPulse = useSharedValue(1);
  const prevHarmony = useSharedValue(state.harmony);

  useEffect(() => {
    if (Math.abs(state.harmony - prevHarmony.value) > 0.1) {
      harmonyPulse.value = withTiming(1.1, { duration: 200 }, () => {
        harmonyPulse.value = withTiming(1, { duration: 300 });
      });
      prevHarmony.value = state.harmony;
    }
  }, [state.harmony]);

  const harmonyPulseStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: harmonyPulse.value }],
    };
  }, []);

  const renderHand = () => {
    console.log('renderHand start - selectedCard:', selectedCard);
    const handCount = state.playerHand.length;
    if (handCount === 0) {
      console.log('renderHand: no cards, returning null');
      return null;
    }

    // Calculate hand arc positioning
    const handWidth = Math.min(screenWidth - padLg * 2, 400);
    const cardSpacing = Math.min(handCardWidth * 0.6, (handWidth - handCardWidth) / Math.max(handCount - 1, 1));
    const maxArcAngle = Math.min(30, handCount * 4); // Max 30 degrees arc
    const arcRadius = handWidth * 1.2; // Larger radius for gentler arc

    return (
      <View style={[styles.handContainer, { width: handWidth, alignSelf: 'center' }]}>
        {state.playerHand.map((cardId, idx) => {
          console.log('Rendering hand card:', cardId, 'idx:', idx);
          const card = cards[cardId];
          if (!card) {
            console.log('Card not found for id:', cardId);
            return null;
          }

          const uniqueKey = makeHandKey(cardId, idx);
          const isSelected = selectedCard === uniqueKey;
          console.log('Hand card - uniqueKey:', uniqueKey, 'isSelected:', isSelected);
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
          const zIndex = isSelected ? 100 : handCount - idx; // Left cards on top, selected always highest

          return (
            <AnimatedHandCard
              key={uniqueKey}
              card={card}
              isSelected={isSelected}
              uniqueKey={uniqueKey}
              x={x}
              y={y}
              rotation={rotation}
              scale={scale}
              zIndex={zIndex}
              handCardWidth={handCardWidth}
              onPress={() => {
                console.log('Card tap - uniqueKey:', uniqueKey, 'isSelected:', isSelected, 'realId:', keyToId(uniqueKey));
                setSelectedCard(isSelected ? null : uniqueKey);
              }}
              disabled={state.phase !== "playerTurn"}
              getEffectDescription={getEffectDescription}
            />
          );
        })}
      </View>
    );
  };

  const range = HARMONY_MAX - HARMONY_MIN;
  const zeroBandY = pointerPadding + (1 - (0 - HARMONY_MIN) / range) * (meterHeight - pointerPadding * 2);


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

      {/* Deck Builder Button */}
      <TouchableOpacity
        onPress={() => setShowDeckSelector(true)}
        activeOpacity={0.8}
        style={[
          styles.deckBuilderButton,
          {
            backgroundColor: colors.background?.secondary || "#fbf6ec",
            borderColor: colors.primary?.[300] || "#7dd3fc",
          }
        ]}
      >
        <Text style={[styles.deckBuilderButtonText, { color: colors.primary?.[600] || "#0284c7" }]}>
          🃏 Build & Manage Decks
        </Text>
        <Text style={[styles.deckBuilderSubtext, { color: colors.text?.secondary || "#44403c" }]}>
          Create custom decks with your favorite cards
        </Text>
      </TouchableOpacity>

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
  console.log('Main render starting - selectedCard:', selectedCard, 'selectedType:', selectedType);

  return (
    <SafeAreaView style={styles.container}>
      {/* Global unified background with paper texture */}
      <Canvas style={[StyleSheet.absoluteFillObject, { pointerEvents: "none" }]}>
        {/* Base parchment gradient */}
        <RoundedRect x={0} y={0} width={screenWidth} height={screenHeight} r={0}>
          <LinearGradient start={vec(0, 0)} end={vec(screenWidth, screenHeight)} colors={boardBackgroundGradient} />
        </RoundedRect>

        {/* Global paper texture overlay */}
        {paperTexture && (
          <Image
            image={paperTexture}
            x={0}
            y={0}
            width={screenWidth}
            height={screenHeight}
            fit="cover"
            opacity={OpacityLevels.inactive}
          />
        )}

        {/* Subtle ambient circles - using theme colors and reduced opacity */}
        <Circle cx={screenWidth * 0.3} cy={screenHeight * 0.25} r={screenWidth * 0.55} color={HarmonyColors.nature.lavender} opacity={0.02} />
        <Circle cx={screenWidth * 0.78} cy={screenHeight * 0.78} r={screenWidth * 0.65} color={HarmonyColors.nature.sage} opacity={0.015} />
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
          <TouchableOpacity
            onPress={() => setShowDeckSelector(true)}
            activeOpacity={0.8}
            style={styles.deckButton}
          >
            <Text style={{ color: colors.text?.secondary || "#57534e", fontSize: 12 }}>
              {deckCollection.decks.find(d => d.id === deckCollection.activeDeckId)?.name || "Deck"}
            </Text>
          </TouchableOpacity>
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
                  <Animated.View style={harmonyPulseStyle}>
                    <HarmonyMeter
                      harmony={state.harmony}
                      baselineHarmony={0}
                      harmonyPointer={harmonyPointer}
                      baselinePointer={zeroBandY}
                      meterWidth={meterWidth}
                      meterHeight={meterHeight}
                      zeroBandY={zeroBandY}
                    />
                  </Animated.View>
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
                <Animated.View style={harmonyPulseStyle}>
                  <HarmonyMeter
                    harmony={state.harmony}
                    baselineHarmony={0}
                    harmonyPointer={harmonyPointer}
                    baselinePointer={zeroBandY}
                    meterWidth={meterWidth}
                    meterHeight={meterHeight}
                    zeroBandY={zeroBandY}
                  />
                </Animated.View>
              </View>
            )}

            <View style={styles.boardContainer}>{renderBoard()}</View>

            {/* Preview Banner */}
            {currentPreview && (
              <View style={[styles.previewBanner, { backgroundColor: colors.background?.secondary || "#fbf6ec" }]}>
                <View style={styles.previewContent}>
                  <Text style={[styles.previewTitle, { color: colors.text?.primary || "#1c1917" }]}>
                    Preview: {currentPreview.card.name}
                  </Text>
                  <View style={styles.previewStats}>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewStatLabel, { color: colors.text?.secondary || "#44403c" }]}>
                        Harmony Change
                      </Text>
                      <Text style={[styles.previewStatValue, {
                        color: Math.abs(currentPreview.harmonyAfter) < Math.abs(currentPreview.harmonyBefore) ? "#10b981" : "#f59e0b"
                      }]}>
                        {currentPreview.harmonyBefore.toFixed(1)} → {currentPreview.harmonyAfter.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewStatLabel, { color: colors.text?.secondary || "#44403c" }]}>
                        Your Score
                      </Text>
                      <Text style={[styles.previewStatValue, {
                        color: currentPreview.contributionDelta > 0 ? "#10b981" : "#ef4444"
                      }]}>
                        {currentPreview.contributionDelta >= 0 ? "+" : ""}{currentPreview.contributionDelta.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  {currentPreview && checkCardSynergy(previewSlot!, currentPreview.board) && (
                    <View style={styles.synergyBanner}>
                      <Text style={[styles.synergyText, { color: "#f59e0b" }]}>
                        ⚡ Type Synergy! Adjacent cards of the same type double their effects
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.previewInstruction, { color: colors.text?.tertiary || "#78716c" }]}>
                    Tap the card again to place it, or select a different card to cancel
                  </Text>
                </View>
              </View>
            )}

            {/* NPC Preview Banner */}
            {npcPreviewData && (
              <View style={[styles.previewBanner, {
                backgroundColor: colors.background?.secondary || "#fbf6ec",
                borderLeftColor: "#a855f7",
                borderLeftWidth: 4
              }]}>
                <View style={styles.previewContent}>
                  <Text style={[styles.previewTitle, { color: colors.text?.primary || "#1c1917" }]}>
                    {opponentName} considering: {npcPreviewData.card.name}
                  </Text>
                  <View style={styles.previewStats}>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewStatLabel, { color: colors.text?.secondary || "#44403c" }]}>
                        Harmony Change
                      </Text>
                      <Text style={[styles.previewStatValue, {
                        color: Math.abs(npcPreviewData.harmonyAfter) < Math.abs(npcPreviewData.harmonyBefore) ? "#10b981" : "#f59e0b"
                      }]}>
                        {npcPreviewData.harmonyBefore.toFixed(1)} → {npcPreviewData.harmonyAfter.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewStatLabel, { color: colors.text?.secondary || "#44403c" }]}>
                        {opponentName}'s Score
                      </Text>
                      <Text style={[styles.previewStatValue, {
                        color: npcPreviewData.contributionDelta > 0 ? "#a855f7" : "#ef4444"
                      }]}>
                        {npcPreviewData.contributionDelta >= 0 ? "+" : ""}{npcPreviewData.contributionDelta.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  {npcPreviewData && npcPreview && checkCardSynergy(npcPreview.slotId, npcPreviewData.board) && (
                    <View style={styles.synergyBanner}>
                      <Text style={[styles.synergyText, { color: "#f59e0b" }]}>
                        ⚡ {opponentName} found a type synergy!
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

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

      {/* Deck Selector Modal */}
      {showDeckSelector && (
        <View style={[styles.overlay, { backgroundColor: colors.background?.overlay || "rgba(0,0,0,0.6)" }]}>
          <View style={[styles.deckSelectorCard, { backgroundColor: colors.background?.secondary || "#fefaf5" }]}>
            <Text style={[styles.deckSelectorTitle, { color: colors.text?.primary || "#1c1917" }]}>
              Choose Your Deck
            </Text>

            <ScrollView style={styles.deckList} showsVerticalScrollIndicator={false}>
              {deckCollection.decks.map((deck) => {
                const isActive = deck.id === deckCollection.activeDeckId;
                return (
                  <TouchableOpacity
                    key={deck.id}
                    onPress={() => {
                      setActiveDeck(deck.id);
                      setShowDeckSelector(false);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.deckItem,
                      {
                        backgroundColor: isActive ? colors.primary?.[100] || "#dbeafe" : "transparent",
                        borderColor: isActive ? colors.primary?.[400] || "#38bdf8" : colors.gray?.[200] || "#e5e7eb",
                      }
                    ]}
                  >
                    <View style={styles.deckItemHeader}>
                      <Text style={[styles.deckItemName, {
                        color: isActive ? colors.primary?.[700] || "#0369a1" : colors.text?.primary || "#1c1917",
                        fontWeight: isActive ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold,
                      }]}>
                        {deck.name}
                      </Text>
                      {isActive && (
                        <View style={[styles.activeBadge, { backgroundColor: colors.primary?.[500] || "#0ea5e9" }]}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.deckItemInfo, { color: colors.text?.secondary || "#44403c" }]}>
                      {deck.cards.length} cards • Created {new Date(deck.created).toLocaleDateString()}
                    </Text>

                    {/* Show card preview for custom decks */}
                    {!deck.id.startsWith("starter") && (
                      <View style={styles.deckPreview}>
                        <Text style={[styles.deckPreviewLabel, { color: colors.text?.tertiary || "#78716c" }]}>
                          Cards:
                        </Text>
                        <View style={styles.deckPreviewCards}>
                          {deck.cards.slice(0, 6).map((cardId, idx) => {
                            const card = cards[cardId];
                            return card ? (
                              <Text key={idx} style={[styles.deckPreviewCard, { color: colors.text?.secondary || "#44403c" }]}>
                                {TYPE_EMOJI[card.type]} {card.name}
                              </Text>
                            ) : null;
                          })}
                          {deck.cards.length > 6 && (
                            <Text style={[styles.deckPreviewMore, { color: colors.text?.tertiary || "#78716c" }]}>
                              +{deck.cards.length - 6} more...
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Edit button for custom decks */}
                    {!deck.id.startsWith("starter") && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setEditingDeck(deck);
                          setBuilderCards([...deck.cards]);
                          setBuilderName(deck.name);
                          setShowDeckSelector(false);
                          setShowDeckBuilder(true);
                        }}
                        style={styles.editDeckButton}
                      >
                        <Text style={[styles.editDeckButtonText, { color: colors.primary?.[600] || "#0284c7" }]}>
                          ✏️ Edit
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.deckSelectorActions}>
              <TouchableOpacity
                onPress={() => setShowDeckSelector(false)}
                activeOpacity={0.8}
                style={[styles.deckActionButton, {
                  backgroundColor: colors.background?.tertiary || "#e7e5e4",
                  borderColor: colors.gray?.[300] || "#d6d3d1",
                }]}
              >
                <Text style={[styles.deckActionButtonText, { color: colors.text?.primary || "#1c1917" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              {deckCollection.decks.filter(d => !d.id.startsWith("starter")).length < 2 && (
                <TouchableOpacity
                  onPress={() => {
                    // Start building a new deck
                    setEditingDeck(null);
                    setBuilderCards(deckCollection.decks.find(d => d.id === "starter-balanced")?.cards || []);
                    setBuilderName(`Custom Deck ${deckCollection.decks.filter(d => !d.id.startsWith("starter")).length + 1}`);
                    setShowDeckSelector(false);
                    setShowDeckBuilder(true);
                  }}
                  activeOpacity={0.8}
                  style={[styles.deckActionButton, {
                    backgroundColor: colors.primary?.[500] || "#0ea5e9",
                  }]}
                >
                  <Text style={[styles.deckActionButtonText, { color: "#ffffff" }]}>
                    Create New Deck
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Deck Builder Modal */}
      {showDeckBuilder && (
        <View style={[styles.overlay, { backgroundColor: colors.background?.overlay || "rgba(0,0,0,0.6)" }]}>
          <View style={[styles.deckBuilderCard, { backgroundColor: colors.background?.secondary || "#fefaf5" }]}>
            <Text style={[styles.deckBuilderTitle, { color: colors.text?.primary || "#1c1917" }]}>
              {editingDeck ? "Edit Deck" : "Create New Deck"}
            </Text>

            {/* Deck Name Input */}
            <View style={styles.deckNameSection}>
              <Text style={[styles.deckNameLabel, { color: colors.text?.secondary || "#44403c" }]}>
                Deck Name:
              </Text>
              <TextInput
                style={[styles.deckNameInput, {
                  borderColor: colors.gray?.[300] || "#d6d3d1",
                  color: colors.text?.primary || "#1c1917",
                  backgroundColor: colors.background?.primary || "#ffffff",
                }]}
                value={builderName}
                onChangeText={setBuilderName}
                placeholder="Enter deck name..."
                placeholderTextColor={colors.text?.tertiary || "#78716c"}
                maxLength={20}
              />
            </View>

            {/* Current Deck Status */}
            <View style={styles.deckStatusSection}>
              <Text style={[styles.deckStatusText, {
                color: builderCards.length === DECK_SIZE ? colors.primary?.[600] || "#0284c7" : colors.orange?.[600] || "#ea580c"
              }]}>
                {builderCards.length}/{DECK_SIZE} cards {builderCards.length === DECK_SIZE ? "✓" : "⚠️"}
              </Text>
              <Text style={[styles.deckStatusHint, { color: colors.text?.tertiary || "#78716c" }]}>
                {builderCards.length === DECK_SIZE ? "Deck ready to save!" : `Need ${DECK_SIZE - builderCards.length} more cards`}
              </Text>
            </View>

            {/* Card Selection */}
            <ScrollView style={styles.cardSelectionArea} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { color: colors.text?.primary || "#1c1917" }]}>
                Available Cards
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.text?.secondary || "#44403c" }]}>
                Tap cards to add/remove (max 3 copies each)
              </Text>

              <View style={styles.cardGrid}>
                {Object.values(cards).map((card) => {
                  const cardCount = builderCards.filter(id => id === card.id).length;
                  const canAdd = cardCount < 3 && builderCards.length < DECK_SIZE;
                  const canRemove = cardCount > 0;

                  return (
                    <TouchableOpacity
                      key={card.id}
                      onPress={() => {
                        if (canAdd && cardCount === 0) {
                          // Add first copy
                          setBuilderCards([...builderCards, card.id]);
                        } else if (canRemove) {
                          // Remove one copy
                          const index = builderCards.findIndex(id => id === card.id);
                          if (index !== -1) {
                            const newCards = [...builderCards];
                            newCards.splice(index, 1);
                            setBuilderCards(newCards);
                          }
                        }
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.builderCard,
                        {
                          opacity: cardCount > 0 ? 1 : 0.7,
                          borderColor: cardCount > 0 ? colors.primary?.[400] || "#38bdf8" : colors.gray?.[200] || "#e5e7eb",
                        }
                      ]}
                    >
                      <HarmonyCard
                        data={card}
                        variant="hand"
                        widthOverride={90}
                      />

                      {/* Card Count Badge */}
                      {cardCount > 0 && (
                        <View style={[styles.cardCountBadge, { backgroundColor: colors.primary?.[500] || "#0ea5e9" }]}>
                          <Text style={styles.cardCountText}>{cardCount}</Text>
                        </View>
                      )}

                      {/* Add/Remove buttons */}
                      <View style={styles.cardActions}>
                        {canRemove && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              const index = builderCards.findIndex(id => id === card.id);
                              if (index !== -1) {
                                const newCards = [...builderCards];
                                newCards.splice(index, 1);
                                setBuilderCards(newCards);
                              }
                            }}
                            style={[styles.cardActionButton, { backgroundColor: colors.red?.[500] || "#ef4444" }]}
                          >
                            <Text style={styles.cardActionButtonText}>-</Text>
                          </TouchableOpacity>
                        )}
                        {canAdd && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              setBuilderCards([...builderCards, card.id]);
                            }}
                            style={[styles.cardActionButton, { backgroundColor: colors.green?.[500] || "#22c55e" }]}
                          >
                            <Text style={styles.cardActionButtonText}>+</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Builder Actions */}
            <View style={styles.builderActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowDeckBuilder(false);
                  setEditingDeck(null);
                  setBuilderCards([]);
                  setBuilderName("");
                }}
                activeOpacity={0.8}
                style={[styles.builderActionButton, {
                  backgroundColor: colors.background?.tertiary || "#e7e5e4",
                  borderColor: colors.gray?.[300] || "#d6d3d1",
                }]}
              >
                <Text style={[styles.builderActionButtonText, { color: colors.text?.primary || "#1c1917" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (builderCards.length !== DECK_SIZE) {
                    Alert.alert("Invalid Deck", `Deck must have exactly ${DECK_SIZE} cards.`);
                    return;
                  }
                  if (!builderName.trim()) {
                    Alert.alert("Invalid Name", "Deck name cannot be empty.");
                    return;
                  }

                  if (editingDeck) {
                    // Update existing deck
                    const success = updateDeck(editingDeck.id, builderName.trim(), builderCards);
                    if (success) {
                      setShowDeckBuilder(false);
                      setEditingDeck(null);
                      setBuilderCards([]);
                      setBuilderName("");
                    } else {
                      Alert.alert("Error", "Failed to update deck.");
                    }
                  } else {
                    // Create new deck
                    const deckId = createDeck(builderName.trim(), builderCards);
                    if (deckId) {
                      setShowDeckBuilder(false);
                      setEditingDeck(null);
                      setBuilderCards([]);
                      setBuilderName("");
                    } else {
                      Alert.alert("Error", "Failed to create deck. Make sure you have less than 2 custom decks.");
                    }
                  }
                }}
                disabled={builderCards.length !== DECK_SIZE || !builderName.trim()}
                activeOpacity={0.8}
                style={[styles.builderActionButton, {
                  backgroundColor: (builderCards.length === DECK_SIZE && builderName.trim())
                    ? colors.primary?.[500] || "#0ea5e9"
                    : colors.gray?.[400] || "#9ca3af",
                }]}
              >
                <Text style={[styles.builderActionButtonText, { color: "#ffffff" }]}>
                  {editingDeck ? "Update Deck" : "Create Deck"}
                </Text>
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
  deckButton: {
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
    height: 280, // Increased height to accommodate expanded selected cards
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
  nameBanner: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 6,
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
  cardBottomSection: {
    width: "100%",
    height: 50,
    marginTop: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBottomContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBottomTitle: {
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
    marginBottom: 2,
  },
  cardBottomText: {
    textAlign: "center",
    fontWeight: FONT_WEIGHT.medium,
  },
  cardBottomFootnote: {
    textAlign: "center",
    fontWeight: FONT_WEIGHT.medium,
    opacity: 0.8,
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
  cardEffectSection: {
    height: 60,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginTop: 4,
  },
  cardEffectContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "center",
  },
  cardEffectTitle: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 2,
    textAlign: "center",
  },
  cardEffectDescription: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 12,
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
  previewBanner: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 2,
  },
  previewContent: {
    gap: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
  },
  previewStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 16,
  },
  previewStat: {
    flex: 1,
    alignItems: "center",
  },
  previewStatLabel: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: 4,
  },
  previewStatValue: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.bold,
  },
  previewInstruction: {
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
  },
  synergyIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    fontSize: 8,
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
    textShadowColor: "rgba(245,158,11,0.8)",
  },
  synergyIndicatorHand: {
    position: "absolute",
    top: -3,
    right: -3,
    fontSize: 10,
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
    textShadowColor: "rgba(245,158,11,0.8)",
  },
  synergyBanner: {
    backgroundColor: "rgba(251,191,36,0.15)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  synergyText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: "center",
  },
  effectIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 3,
  },
  effectIndicatorText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    color: "#ffffff",
  },
  // Deck Selector Modal Styles
  deckSelectorCard: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 24,
    padding: 24,
    alignItems: "stretch",
    gap: 16,
  },
  deckSelectorTitle: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  deckList: {
    maxHeight: 300,
  },
  deckItem: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  deckItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deckItemName: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.semibold,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deckItemInfo: {
    fontSize: 12,
    opacity: 0.8,
  },
  deckPreview: {
    marginTop: 8,
    gap: 4,
  },
  deckPreviewLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deckPreviewCards: {
    gap: 2,
  },
  deckPreviewCard: {
    fontSize: 11,
    paddingLeft: 8,
  },
  deckPreviewMore: {
    fontSize: 11,
    fontStyle: "italic",
    paddingLeft: 8,
  },
  deckSelectorActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  deckActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  deckActionButtonText: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
  },
  // Deck Builder Button in opponent selection
  deckBuilderButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: 16,
  },
  deckBuilderButtonText: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 4,
  },
  deckBuilderSubtext: {
    fontSize: 12,
    fontStyle: "italic",
  },
  // Edit deck button
  editDeckButton: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  editDeckButtonText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
  },
  // Deck Builder Modal Styles
  deckBuilderCard: {
    width: "95%",
    maxHeight: "85%",
    borderRadius: 24,
    padding: 20,
    alignItems: "stretch",
    gap: 16,
  },
  deckBuilderTitle: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  deckNameSection: {
    gap: 8,
  },
  deckNameLabel: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
  },
  deckNameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  deckStatusSection: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  deckStatusText: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
  },
  deckStatusHint: {
    fontSize: 12,
    fontStyle: "italic",
  },
  cardSelectionArea: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-around",
  },
  builderCard: {
    position: "relative",
    borderWidth: 2,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  cardCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  cardCountText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    color: "#ffffff",
  },
  cardActions: {
    position: "absolute",
    bottom: -8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  cardActionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardActionButtonText: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.bold,
    color: "#ffffff",
  },
  builderActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  builderActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  builderActionButtonText: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
