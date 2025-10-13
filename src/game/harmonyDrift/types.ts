// src/game/harmonyDrift/types.ts
export type HarmonyRow = "A" | "B" | "C";
export type HarmonyPlayer = "player" | "npc";

export type CardType = "Energy" | "Calm" | "Rest" | "Nourish" | "Anchor";
export type CardRarity = "common" | "rare" | "epic";

export type CardEffectKind =
  | "adjacentModify"
  | "typeModify"
  | "globalScale"
  | "pattern"
  | "none";

export interface CardEffect {
  kind: CardEffectKind;
  delta?: number;
  radius?: number;
  targetType?: CardType;
  pattern?: [number, number][];
  factor?: number;
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  value: number;
  rarity: CardRarity;
  flavor?: string;
  artAsset: string;
  effect?: CardEffect;
}

export interface HarmonySlot {
  id: string;
  row: HarmonyRow;
  col: number;
  neighbors: string[];
}

export interface PlacedCard {
  cardId: string;
  owner: HarmonyPlayer;
  baseValue: number;
  value: number;
  type: CardType;
  name: string;
  rarity: CardRarity;
  artAsset: string;
  effect?: CardEffect;
  flavor?: string;
}

export interface MoveResolution {
  slotId: string;
  card: Card;
  owner: HarmonyPlayer;
  harmonyBefore: number;
  harmonyAfter: number;
  contributionDelta: number;
  board: Record<string, PlacedCard | undefined>;
}

export type HarmonyPhase =
  | "idle"
  | "drawing"
  | "playerTurn"
  | "npcTurn"
  | "resolving"
  | "completed";

export interface HarmonyMatchResult {
  winner: HarmonyPlayer | "draw";
  finalHarmony: number;
  playerContribution: number;
  npcContribution: number;
}

export interface HarmonyMatchState {
  phase: HarmonyPhase;
  opponent: "luma" | "sable";
  turnCount: number;
  baselineHarmony: number;
  harmony: number;
  playerContribution: number;
  npcContribution: number;
  board: Record<string, PlacedCard | undefined>;
  playerDeck: string[];
  npcDeck: string[];
  playerHand: string[];
  npcHand: string[];
  playerDiscard: string[];
  npcDiscard: string[];
  lastMove?: MoveResolution;
  result?: HarmonyMatchResult;
}

export interface HarmonyDriftContext {
  state: HarmonyMatchState;
  cards: Record<string, Card>;
}
