// src/game/harmonyDrift/store.ts
import { create } from "zustand";
import { HarmonyDriftContext, HarmonyMatchState, HarmonyPlayer, HarmonyPhase, HarmonyMatchResult } from "./types";
import { HARMONY_CARD_INDEX, buildStarterDeck } from "./cards";
import { HARMONY_SLOT_MAP, SLOT_IDS, findSlotByOffset } from "./layout";
import { Card, MoveResolution, PlacedCard } from "./types";

const MAX_HAND = 5;

const INITIAL_DRIFT_MIN = 3;
const INITIAL_DRIFT_MAX = 10;

const generateInitialHarmony = () => {
  const magnitude = INITIAL_DRIFT_MIN + Math.random() * (INITIAL_DRIFT_MAX - INITIAL_DRIFT_MIN);
  const sign = Math.random() < 0.5 ? -1 : 1;
  return Number((magnitude * sign).toFixed(1));
};

const cloneBoard = (board: Record<string, PlacedCard | undefined>) => {
  const copy: Record<string, PlacedCard | undefined> = {};
  SLOT_IDS.forEach((slotId) => {
    const occupant = board[slotId];
    copy[slotId] = occupant ? { ...occupant } : undefined;
  });
  return copy;
};

const calculateHarmony = (
  board: Record<string, PlacedCard | undefined>,
  baseline = 0
) => {
  let total = baseline;
  SLOT_IDS.forEach((slotId) => {
    total += board[slotId]?.value ?? 0;
  });
  return Number(total.toFixed(4));
};

const applyTypeDelta = (
  board: Record<string, PlacedCard | undefined>,
  targetType: Card["type"],
  delta: number
) => {
  SLOT_IDS.forEach((slotId) => {
    const occupant = board[slotId];
    if (occupant && occupant.type === targetType) {
      occupant.value += delta;
    }
  });
};

const applyGlobalScale = (
  board: Record<string, PlacedCard | undefined>,
  factor: number
) => {
  SLOT_IDS.forEach((slotId) => {
    const occupant = board[slotId];
    if (occupant) {
      occupant.value *= factor;
    }
  });
};

const applyAdjacentDelta = (
  board: Record<string, PlacedCard | undefined>,
  sourceSlot: string,
  delta: number
) => {
  const slot = HARMONY_SLOT_MAP[sourceSlot];
  if (!slot) return;
  slot.neighbors.forEach((neighborId) => {
    const occupant = board[neighborId];
    if (occupant) {
      occupant.value += delta;
    }
  });
};

const applyPatternDelta = (
  board: Record<string, PlacedCard | undefined>,
  sourceSlot: string,
  pattern: [number, number][],
  delta: number
) => {
  pattern.forEach(([rowOffset, colOffset]) => {
    const targetId = findSlotByOffset(sourceSlot, rowOffset, colOffset);
    if (!targetId) return;
    const occupant = board[targetId];
    if (occupant) {
      occupant.value += delta;
    }
  });
};

const applyTypeSynergies = (
  board: Record<string, PlacedCard | undefined>,
  slotId: string
) => {
  const placedCard = board[slotId];
  if (!placedCard) return;

  const slot = HARMONY_SLOT_MAP[slotId];
  if (!slot) return;

  // Count adjacent cards of the same type
  let sameTypeNeighbors = 0;
  slot.neighbors.forEach((neighborId) => {
    const neighbor = board[neighborId];
    if (neighbor && neighbor.type === placedCard.type) {
      sameTypeNeighbors++;
    }
  });

  // If there are any same-type neighbors, double the card's effect
  if (sameTypeNeighbors > 0) {
    placedCard.value = placedCard.baseValue * 2;

    // Also apply synergy to all same-type neighbors
    slot.neighbors.forEach((neighborId) => {
      const neighbor = board[neighborId];
      if (neighbor && neighbor.type === placedCard.type) {
        neighbor.value = neighbor.baseValue * 2;
      }
    });
  }
};

const applyAllTypeSynergies = (
  board: Record<string, PlacedCard | undefined>
) => {
  // Reset all cards to base values first
  SLOT_IDS.forEach((slotId) => {
    const card = board[slotId];
    if (card) {
      card.value = card.baseValue;
    }
  });

  // Then apply synergies for all placed cards
  SLOT_IDS.forEach((slotId) => {
    const card = board[slotId];
    if (card) {
      applyTypeSynergies(board, slotId);
    }
  });
};

const simulatePlacement = (
  state: HarmonyMatchState,
  owner: HarmonyPlayer,
  cardId: string,
  slotId: string
): MoveResolution | undefined => {
  const card = HARMONY_CARD_INDEX[cardId];
  if (!card) return undefined;
  if (state.board[slotId]) return undefined;

  const boardCopy = cloneBoard(state.board);
  boardCopy[slotId] = {
    cardId,
    owner,
    baseValue: card.value,
    value: card.value,
    type: card.type,
    name: card.name,
    rarity: card.rarity,
    artAsset: card.artAsset,
    effect: card.effect,
    flavor: card.flavor,
  };

  if (card.effect) {
    switch (card.effect.kind) {
      case "adjacentModify":
        applyAdjacentDelta(boardCopy, slotId, card.effect.delta ?? 0);
        break;
      case "typeModify":
        if (card.effect.targetType && typeof card.effect.delta === "number") {
          applyTypeDelta(boardCopy, card.effect.targetType, card.effect.delta);
        }
        break;
      case "globalScale":
        if (typeof card.effect.factor === "number" && card.effect.factor !== 1) {
          applyGlobalScale(boardCopy, card.effect.factor);
        }
        break;
      case "pattern":
        if (card.effect.pattern && typeof card.effect.delta === "number") {
          applyPatternDelta(boardCopy, slotId, card.effect.pattern, card.effect.delta);
        }
        break;
      case "none":
      default:
        break;
    }
  }

  // Apply type synergies after all card effects
  applyAllTypeSynergies(boardCopy);

  const harmonyBefore = state.harmony;
  const harmonyAfter = calculateHarmony(boardCopy, state.baselineHarmony);
  const contributionDelta = Number((Math.abs(harmonyBefore) - Math.abs(harmonyAfter)).toFixed(4));

  return {
    slotId,
    card,
    owner,
    harmonyBefore,
    harmonyAfter,
    contributionDelta,
    board: boardCopy,
  };
};

const shuffle = <T>(input: T[]): T[] => {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
};

const createEmptyBoard = (): Record<string, PlacedCard | undefined> => {
  const board: Record<string, PlacedCard | undefined> = {};
  SLOT_IDS.forEach((slotId) => {
    board[slotId] = undefined;
  });
  return board;
};

const boardIsFull = (board: Record<string, PlacedCard | undefined>) => {
  return SLOT_IDS.every((slotId) => Boolean(board[slotId]));
};

const drawUpTo = (
  hand: string[],
  deck: string[],
  discard: string[],
  max: number
) => {
  const nextHand = [...hand];
  const nextDeck = [...deck];
  const nextDiscard = [...discard];

  while (nextHand.length < max) {
    if (nextDeck.length === 0) {
      if (nextDiscard.length === 0) break;
      const reshuffled = shuffle(nextDiscard);
      nextDeck.push(...reshuffled);
      nextDiscard.length = 0;
    }
    const drawn = nextDeck.shift();
    if (!drawn) break;
    nextHand.push(drawn);
  }

  return { hand: nextHand, deck: nextDeck, discard: nextDiscard };
};

const initialState: HarmonyMatchState = {
  phase: "idle",
  opponent: "sable",
  turnCount: 0,
  baselineHarmony: 0,
  harmony: 0,
  playerContribution: 0,
  npcContribution: 0,
  board: createEmptyBoard(),
  playerDeck: [],
  npcDeck: [],
  playerHand: [],
  npcHand: [],
  playerDiscard: [],
  npcDiscard: [],
};

interface HarmonyDriftActions {
  startMatch: (opponent: "luma" | "sable") => void;
  playPlayerCard: (cardId: string, slotId: string) => MoveResolution | undefined;
  npcTakeTurn: () => MoveResolution | undefined;
  endMatch: () => void;
  reset: () => void;
  previewPlacement: (cardId: string, slotId: string) => MoveResolution | undefined;
  getPlacementPreview: (cardId: string) => Record<string, MoveResolution>;
}

export const useHarmonyDriftStore = create<HarmonyDriftContext & HarmonyDriftActions>(() => ({
  state: initialState,
  cards: HARMONY_CARD_INDEX,
  startMatch: () => undefined,
  playPlayerCard: () => undefined,
  npcTakeTurn: () => undefined,
  endMatch: () => undefined,
  reset: () => undefined,
  previewPlacement: () => undefined,
  getPlacementPreview: () => ({}),
}));

const evaluateNpcMove = (
  state: HarmonyMatchState,
  cardId: string,
  slotId: string
) => {
  const resolution = simulatePlacement(state, "npc", cardId, slotId);
  if (!resolution) return undefined;
  const stability = Math.abs(resolution.harmonyAfter);
  const score = resolution.contributionDelta;
  return { resolution, score, stability };
};

const computeResult = (state: HarmonyMatchState): HarmonyMatchResult => {
  const player = Number(state.playerContribution.toFixed(4));
  const npc = Number(state.npcContribution.toFixed(4));
  let winner: HarmonyMatchResult["winner"] = "draw";
  if (player > npc) winner = "player";
  else if (npc > player) winner = "npc";
  return {
    winner,
    finalHarmony: Number(state.harmony.toFixed(4)),
    playerContribution: player,
    npcContribution: npc,
  };
};

useHarmonyDriftStore.setState((current) => {
  const startMatch: HarmonyDriftActions["startMatch"] = (opponent) => {
    const playerDeck = shuffle(buildStarterDeck());
    const npcDeck = shuffle(buildStarterDeck());

    const { hand: playerHand, deck: playerDrawDeck } = drawUpTo([], playerDeck, [], MAX_HAND);
    const { hand: npcHand, deck: npcDrawDeck } = drawUpTo([], npcDeck, [], MAX_HAND);
    const baselineHarmony = generateInitialHarmony();

    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      state: {
        phase: "playerTurn",
        opponent,
        turnCount: 1,
        baselineHarmony,
        harmony: baselineHarmony,
        playerContribution: 0,
        npcContribution: 0,
        board: createEmptyBoard(),
        playerDeck: playerDrawDeck,
        npcDeck: npcDrawDeck,
        playerHand,
        npcHand,
        playerDiscard: [],
        npcDiscard: [],
        lastMove: undefined,
        result: undefined,
      },
    }));
  };

  const playPlayerCard: HarmonyDriftActions["playPlayerCard"] = (cardId, slotId) => {
    const baseState = useHarmonyDriftStore.getState().state;
    if (baseState.phase !== "playerTurn") return undefined;
    if (!baseState.playerHand.includes(cardId)) return undefined;
    if (baseState.board[slotId]) return undefined;

    const resolution = simulatePlacement(baseState, "player", cardId, slotId);
    if (!resolution) return undefined;

    const nextHand = baseState.playerHand.filter((id, idx) => {
      if (id !== cardId) return true;
      // remove only first occurrence
      const firstIndex = baseState.playerHand.indexOf(cardId);
      return idx !== firstIndex;
    });

    const nextDiscard = [...baseState.playerDiscard, cardId];

    const isComplete = boardIsFull(resolution.board);

    const playerDraw = drawUpTo(nextHand, baseState.playerDeck, nextDiscard, MAX_HAND);

    const updatedState: HarmonyMatchState = {
      ...baseState,
      phase: isComplete ? "completed" : "npcTurn",
      turnCount: baseState.turnCount + 1,
      harmony: resolution.harmonyAfter,
      playerContribution: baseState.playerContribution + resolution.contributionDelta,
      board: resolution.board,
      playerHand: playerDraw.hand,
      playerDeck: playerDraw.deck,
      playerDiscard: playerDraw.discard,
      lastMove: resolution,
    };

    if (isComplete) {
      updatedState.result = computeResult(updatedState);
    }

    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      state: updatedState,
    }));

    return resolution;
  };

  const npcTakeTurn: HarmonyDriftActions["npcTakeTurn"] = () => {
    const baseState = useHarmonyDriftStore.getState().state;
    if (baseState.phase !== "npcTurn") return undefined;

    let best: { resolution: MoveResolution; score: number; stability: number } | undefined;

    baseState.npcHand.forEach((cardId) => {
      SLOT_IDS.forEach((slotId) => {
        if (baseState.board[slotId]) return;
        const candidate = evaluateNpcMove(baseState, cardId, slotId);
        if (!candidate) return;
        if (!best) {
          best = candidate;
          return;
        }
        if (candidate.score > best.score) {
          best = candidate;
          return;
        }
        if (candidate.score === best.score && candidate.stability < best.stability) {
          best = candidate;
        }
      });
    });

    if (!best) {
      // No valid move (hand empty or board full)
      const nextPhase: HarmonyPhase = boardIsFull(baseState.board) ? "completed" : "playerTurn";
      const updated: HarmonyMatchState = {
        ...baseState,
        phase: nextPhase,
      };
      if (nextPhase === "completed") {
        updated.result = computeResult(updated);
      }
      useHarmonyDriftStore.setState((prev) => ({
        ...prev,
        state: updated,
      }));
      return undefined;
    }

    const { resolution } = best;

    const removalIndex = baseState.npcHand.indexOf(resolution.card.id);
    const nextHand = baseState.npcHand.filter((_, idx) => idx !== removalIndex);
    const nextDiscard = [...baseState.npcDiscard, resolution.card.id];

    const isComplete = boardIsFull(resolution.board);

    const npcDraw = drawUpTo(nextHand, baseState.npcDeck, nextDiscard, MAX_HAND);

    const nextPhase: HarmonyPhase = isComplete ? "completed" : "playerTurn";

    const updatedState: HarmonyMatchState = {
      ...baseState,
      phase: nextPhase,
      turnCount: baseState.turnCount + 1,
      harmony: resolution.harmonyAfter,
      npcContribution: baseState.npcContribution + resolution.contributionDelta,
      board: resolution.board,
      npcHand: npcDraw.hand,
      npcDeck: npcDraw.deck,
      npcDiscard: npcDraw.discard,
      lastMove: resolution,
    };

    if (nextPhase === "completed") {
      updatedState.result = computeResult(updatedState);
    }

    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      state: updatedState,
    }));

    return resolution;
  };

  const endMatch: HarmonyDriftActions["endMatch"] = () => {
    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      state: {
        ...initialState,
        board: createEmptyBoard(),
      },
    }));
  };

  const reset: HarmonyDriftActions["reset"] = () => {
    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      state: {
        ...initialState,
        board: createEmptyBoard(),
      },
    }));
  };

  const previewPlacement: HarmonyDriftActions["previewPlacement"] = (cardId, slotId) => {
    const currentState = useHarmonyDriftStore.getState().state;
    if (currentState.phase !== "playerTurn") return undefined;
    if (!currentState.playerHand.includes(cardId)) return undefined;

    return simulatePlacement(currentState, "player", cardId, slotId);
  };

  const getPlacementPreview: HarmonyDriftActions["getPlacementPreview"] = (cardId) => {
    const currentState = useHarmonyDriftStore.getState().state;
    if (currentState.phase !== "playerTurn") return {};
    if (!currentState.playerHand.includes(cardId)) return {};

    const previews: Record<string, MoveResolution> = {};
    SLOT_IDS.forEach((slotId) => {
      if (!currentState.board[slotId]) {
        const preview = simulatePlacement(currentState, "player", cardId, slotId);
        if (preview) {
          previews[slotId] = preview;
        }
      }
    });

    return previews;
  };

  return {
    ...current,
    startMatch,
    playPlayerCard,
    npcTakeTurn,
    endMatch,
    reset,
    previewPlacement,
    getPlacementPreview,
  };
});
