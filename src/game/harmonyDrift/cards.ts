// src/game/harmonyDrift/cards.ts
import { Card } from "./types";

export const HARMONY_STARTER_CARDS: Card[] = [
  {
    id: "hd_morning_walk",
    name: "Morning Walk",
    type: "Calm",
    value: -1,
    rarity: "common",
    flavor: "A gentle stroll that steadies numbers before the day begins.",
    artAsset: "emoji:walk",
    effect: {
      kind: "adjacentModify",
      delta: -1,
    },
  },
  {
    id: "hd_sensor_alert",
    name: "Sensor Alert",
    type: "Energy",
    value: 3,
    rarity: "rare",
    flavor: "A fast spike of adrenaline and glucose.",
    artAsset: "emoji:alert",
    effect: {
      kind: "adjacentModify",
      delta: 1,
    },
  },
  {
    id: "hd_low_treat",
    name: "Low Treat",
    type: "Nourish",
    value: 2,
    rarity: "common",
    flavor: "Juice box boost that raises the tide just enough.",
    artAsset: "emoji:juice",
    effect: {
      kind: "typeModify",
      targetType: "Nourish",
      delta: 1,
    },
  },
  {
    id: "hd_temp_basal",
    name: "Temp Basal",
    type: "Anchor",
    value: 0,
    rarity: "rare",
    flavor: "Dialing the pump to gently pull toward center.",
    artAsset: "emoji:dial",
    effect: {
      kind: "globalScale",
      factor: 0.6,
    },
  },
  {
    id: "hd_sunrise_yoga",
    name: "Sunrise Yoga",
    type: "Calm",
    value: -2,
    rarity: "rare",
    flavor: "Breath and stretch ease the morning climb.",
    artAsset: "emoji:yoga",
    effect: {
      kind: "pattern",
      pattern: [[0, -1], [0, 1]],
      delta: -1,
    },
  },
  {
    id: "hd_evening_walk",
    name: "Evening Walk",
    type: "Rest",
    value: -1,
    rarity: "common",
    flavor: "A dusk cooldown that coaxes readings down.",
    artAsset: "emoji:dusk",
    effect: { kind: "none" },
  },
  {
    id: "hd_midnight_snack",
    name: "Midnight Snack",
    type: "Energy",
    value: 2,
    rarity: "common",
    flavor: "Cookies before bed push the drift upward.",
    artAsset: "emoji:snack",
    effect: {
      kind: "typeModify",
      targetType: "Energy",
      delta: 1,
    },
  },
  {
    id: "hd_deep_sleep",
    name: "Deep Sleep",
    type: "Rest",
    value: -2,
    rarity: "rare",
    flavor: "Restorative sleep that smooths swings overnight.",
    artAsset: "emoji:sleep",
    effect: {
      kind: "globalScale",
      factor: 0.75,
    },
  },
  {
    id: "hd_hydrate",
    name: "Hydrate",
    type: "Nourish",
    value: 1,
    rarity: "common",
    flavor: "Water keeps things steady and refreshed.",
    artAsset: "emoji:water",
    effect: { kind: "none" },
  },
  {
    id: "hd_bolus_check",
    name: "Bolus Check",
    type: "Anchor",
    value: 0,
    rarity: "rare",
    flavor: "Revisiting math to adjust for the meal ahead.",
    artAsset: "emoji:note",
    effect: {
      kind: "adjacentModify",
      delta: -1,
    },
  },
  {
    id: "hd_fiber_plate",
    name: "Fiber Plate",
    type: "Nourish",
    value: 1,
    rarity: "common",
    flavor: "Balanced meal that slows the rise.",
    artAsset: "emoji:salad",
    effect: {
      kind: "pattern",
      pattern: [[1, 0], [-1, 0]],
      delta: -1,
    },
  },
  {
    id: "hd_interval_sprint",
    name: "Interval Sprint",
    type: "Energy",
    value: 1,
    rarity: "rare",
    flavor: "Quick bursts shake the system, ripple outward.",
    artAsset: "emoji:sprint",
    effect: {
      kind: "pattern",
      pattern: [[0, -1], [0, 1], [1, 0], [-1, 0]],
      delta: 1,
    },
  },
];

export const HARMONY_CARD_INDEX = HARMONY_STARTER_CARDS.reduce<Record<string, Card>>((map, card) => {
  map[card.id] = card;
  return map;
}, {});

export const buildStarterDeck = (): string[] => {
  // Simple 18-card deck (three copies of common, two of rares)
  const deck: string[] = [];
  HARMONY_STARTER_CARDS.forEach((card) => {
    const copies = card.rarity === "common" ? 3 : 2;
    for (let i = 0; i < copies; i++) {
      deck.push(card.id);
    }
  });
  return deck;
};
