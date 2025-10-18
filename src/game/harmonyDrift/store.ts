// src/game/harmonyDrift/store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HarmonyDriftContext, HarmonyMatchState, HarmonyPlayer, HarmonyPhase, HarmonyMatchResult, CustomDeck, DeckCollection } from "./types";
import { HARMONY_CARD_INDEX, buildStarterDeck, buildBalancedDeck, isValidDeck, DECK_SIZE } from "./cards";
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

const applyAdjacentScale = (
  board: Record<string, PlacedCard | undefined>,
  sourceSlot: string,
  factor: number
) => {
  const slot = HARMONY_SLOT_MAP[sourceSlot];
  if (!slot) return;
  slot.neighbors.forEach((neighborId) => {
    const occupant = board[neighborId];
    if (occupant) {
      occupant.value *= factor;
    }
  });
};

const applyRadiusModify = (
  board: Record<string, PlacedCard | undefined>,
  sourceSlot: string,
  radius: number,
  delta: number
) => {
  const sourceSlotData = HARMONY_SLOT_MAP[sourceSlot];
  if (!sourceSlotData) return;

  SLOT_IDS.forEach((targetSlotId) => {
    if (targetSlotId === sourceSlot) return; // Don't affect self

    const targetSlotData = HARMONY_SLOT_MAP[targetSlotId];
    if (!targetSlotData) return;

    // Calculate distance (simplified grid distance)
    const sourceRow = sourceSlotData.row;
    const sourceCol = sourceSlotData.col;
    const targetRow = targetSlotData.row;
    const targetCol = targetSlotData.col;

    const rowDistance = Math.abs(
      (sourceRow === "A" ? 0 : sourceRow === "B" ? 1 : 2) -
      (targetRow === "A" ? 0 : targetRow === "B" ? 1 : 2)
    );
    const colDistance = Math.abs(sourceCol - targetCol);
    const distance = Math.max(rowDistance, colDistance);

    if (distance <= radius) {
      const occupant = board[targetSlotId];
      if (occupant) {
        occupant.value += delta;
      }
    }
  });
};

const applyConditionalModify = (
  board: Record<string, PlacedCard | undefined>,
  sourceSlot: string,
  condition: string,
  delta: number
) => {
  const slot = HARMONY_SLOT_MAP[sourceSlot];
  const placedCard = board[sourceSlot];
  if (!slot || !placedCard) return;

  if (condition === "adjacentCount") {
    // Add delta for each adjacent card
    let adjacentCount = 0;
    slot.neighbors.forEach((neighborId) => {
      if (board[neighborId]) {
        adjacentCount++;
      }
    });
    placedCard.value += delta * adjacentCount;
  }
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
      case "adjacentScale":
        if (typeof card.effect.factor === "number") {
          applyAdjacentScale(boardCopy, slotId, card.effect.factor);
        }
        break;
      case "radiusModify":
        if (typeof card.effect.radius === "number" && typeof card.effect.delta === "number") {
          applyRadiusModify(boardCopy, slotId, card.effect.radius, card.effect.delta);
        }
        break;
      case "conditionalModify":
        if (card.effect.condition && typeof card.effect.delta === "number") {
          applyConditionalModify(boardCopy, slotId, card.effect.condition, card.effect.delta);
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
  const harmonyAfterCards = calculateHarmony(boardCopy, state.baselineHarmony);

  // Calculate contribution delta BEFORE applying harmonyShift
  let contributionDelta = Number((Math.abs(harmonyBefore) - Math.abs(harmonyAfterCards)).toFixed(4));

  // Handle harmonyShift effect - this affects harmony but NOT the player's score
  let harmonyAfter = harmonyAfterCards;
  if (card.effect?.kind === "harmonyShift" && typeof card.effect.harmonyDelta === "number") {
    harmonyAfter += card.effect.harmonyDelta;
    // Don't recalculate contributionDelta - keep it based only on card values
  }

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

const initialDeckCollection: DeckCollection = {
  decks: [
    {
      id: "starter",
      name: "Starter Deck",
      cards: buildStarterDeck(),
      created: Date.now(),
      lastModified: Date.now(),
    },
    {
      id: "balanced",
      name: "Synergy Focus",
      cards: buildBalancedDeck(),
      created: Date.now(),
      lastModified: Date.now(),
    }
  ],
  activeDeckId: "starter",
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
  // Deck management
  createDeck: (name: string, cards: string[]) => string | null;
  updateDeck: (deckId: string, name: string, cards: string[]) => boolean;
  deleteDeck: (deckId: string) => boolean;
  setActiveDeck: (deckId: string) => boolean;
  getActiveDeck: () => CustomDeck | null;
}

export const useHarmonyDriftStore = create<HarmonyDriftContext & HarmonyDriftActions>()(
  persist(
    () => ({
      state: initialState,
      cards: HARMONY_CARD_INDEX,
      deckCollection: initialDeckCollection,
      startMatch: () => undefined,
      playPlayerCard: () => undefined,
      npcTakeTurn: () => undefined,
      endMatch: () => undefined,
      reset: () => undefined,
      previewPlacement: () => undefined,
      getPlacementPreview: () => ({}),
      // Deck management placeholders
      createDeck: () => null,
      updateDeck: () => false,
      deleteDeck: () => false,
      setActiveDeck: () => false,
      getActiveDeck: () => null,
    }),
    {
      name: 'harmony-drift-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the deck collection, not the active game state
      partialize: (state) => ({
        deckCollection: state.deckCollection
      }),
    }
  )
);

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
    const activeDeck = current.deckCollection.decks.find(d => d.id === current.deckCollection.activeDeckId);
    const deckCards = activeDeck ? activeDeck.cards : buildStarterDeck();

    const playerDeck = shuffle([...deckCards]);
    const npcDeck = shuffle(buildStarterDeck());

    // TEMPORARY: Force PNG art cards into hand for testing
    const pngArtCards = ["hd_morning_walk", "hd_deep_sleep", "hd_heat_wave", "hd_anxiety_spiral", "hd_low_treat"];
    const { hand: playerHand, deck: playerDrawDeck } = drawUpTo(pngArtCards, playerDeck, [], MAX_HAND);
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

  const createDeck: HarmonyDriftActions["createDeck"] = (name, cards) => {
    const validation = isValidDeck(cards);
    if (!validation.valid) {
      console.warn("Invalid deck:", validation.errors);
      return null;
    }

    if (current.deckCollection.decks.length >= 2) {
      console.warn("Maximum deck limit reached");
      return null;
    }

    const newDeckId = `deck_${Date.now()}`;
    const newDeck: CustomDeck = {
      id: newDeckId,
      name,
      cards: [...cards],
      created: Date.now(),
      lastModified: Date.now(),
    };

    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      deckCollection: {
        ...prev.deckCollection,
        decks: [...prev.deckCollection.decks, newDeck],
      },
    }));

    return newDeckId;
  };

  const updateDeck: HarmonyDriftActions["updateDeck"] = (deckId, name, cards) => {
    const validation = isValidDeck(cards);
    if (!validation.valid) {
      console.warn("Invalid deck:", validation.errors);
      return false;
    }

    const deckIndex = current.deckCollection.decks.findIndex(d => d.id === deckId);
    if (deckIndex === -1) {
      return false;
    }

    // Don't allow updating starter decks
    if (deckId === "starter" || deckId === "balanced") {
      return false;
    }

    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      deckCollection: {
        ...prev.deckCollection,
        decks: prev.deckCollection.decks.map(deck =>
          deck.id === deckId
            ? { ...deck, name, cards: [...cards], lastModified: Date.now() }
            : deck
        ),
      },
    }));

    return true;
  };

  const deleteDeck: HarmonyDriftActions["deleteDeck"] = (deckId) => {
    // Don't allow deleting starter decks
    if (deckId === "starter" || deckId === "balanced") {
      return false;
    }

    const deckExists = current.deckCollection.decks.some(d => d.id === deckId);
    if (!deckExists) {
      return false;
    }

    const newActiveDeckId = current.deckCollection.activeDeckId === deckId
      ? "starter"
      : current.deckCollection.activeDeckId;

    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      deckCollection: {
        decks: prev.deckCollection.decks.filter(d => d.id !== deckId),
        activeDeckId: newActiveDeckId,
      },
    }));

    return true;
  };

  const setActiveDeck: HarmonyDriftActions["setActiveDeck"] = (deckId) => {
    const deckExists = current.deckCollection.decks.some(d => d.id === deckId);
    if (!deckExists) {
      return false;
    }

    useHarmonyDriftStore.setState((prev) => ({
      ...prev,
      deckCollection: {
        ...prev.deckCollection,
        activeDeckId: deckId,
      },
    }));

    return true;
  };

  const getActiveDeck: HarmonyDriftActions["getActiveDeck"] = () => {
    return current.deckCollection.decks.find(d => d.id === current.deckCollection.activeDeckId) || null;
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
    createDeck,
    updateDeck,
    deleteDeck,
    setActiveDeck,
    getActiveDeck,
  };
});
