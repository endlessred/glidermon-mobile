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
    artAsset: "MorningWalk.png",
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
    artAsset: "JuiceBox.png",
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
    artAsset: "DeepSleep.png",
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
  // Strategic Enhancement Cards
  {
    id: "hd_heat_wave",
    name: "Heat Wave",
    type: "Energy",
    value: 4,
    rarity: "epic",
    flavor: "Scorching heat radiates outward, weakening everything around it.",
    artAsset: "HeatWave.png",
    effect: {
      kind: "adjacentScale",
      factor: 0.5, // Halves adjacent card values
    },
  },
  {
    id: "hd_unexpected_swing",
    name: "Unexpected Swing",
    type: "Anchor",
    value: 0,
    rarity: "epic",
    flavor: "Wild glucose swing that throws everything off balance.",
    artAsset: "emoji:chaos",
    effect: {
      kind: "harmonyShift",
      harmonyDelta: 8, // Large harmony shift without affecting score
    },
  },
  {
    id: "hd_correction_bolus",
    name: "Correction Bolus",
    type: "Anchor",
    value: 0,
    rarity: "rare",
    flavor: "Calculated dose that pulls readings toward target.",
    artAsset: "emoji:target",
    effect: {
      kind: "globalScale",
      factor: 0.3, // Pulls harmony toward zero by 70%
    },
  },
  {
    id: "hd_adrenaline_surge",
    name: "Adrenaline Surge",
    type: "Energy",
    value: 3,
    rarity: "rare",
    flavor: "Stress hormones amplify nearby glucose responses.",
    artAsset: "emoji:lightning",
    effect: {
      kind: "radiusModify",
      radius: 2,
      delta: 2,
    },
  },
  {
    id: "hd_zen_meditation",
    name: "Zen Meditation",
    type: "Calm",
    value: -1,
    rarity: "rare",
    flavor: "Deep calm spreads peace in all directions.",
    artAsset: "emoji:peace",
    effect: {
      kind: "radiusModify",
      radius: 2,
      delta: -1,
    },
  },
  {
    id: "hd_domino_effect",
    name: "Domino Effect",
    type: "Anchor",
    value: 0,
    rarity: "epic",
    flavor: "One small change cascades through the entire system.",
    artAsset: "emoji:domino",
    effect: {
      kind: "conditionalModify",
      condition: "adjacentCount",
      delta: 1, // +1 for each adjacent card
    },
  },
  {
    id: "hd_insulin_storm",
    name: "Insulin Storm",
    type: "Calm",
    value: -3,
    rarity: "epic",
    flavor: "Overwhelming correction that dims all energy cards.",
    artAsset: "emoji:storm",
    effect: {
      kind: "typeModify",
      targetType: "Energy",
      delta: -2,
    },
  },
  {
    id: "hd_glucose_spike",
    name: "Glucose Spike",
    type: "Energy",
    value: 5,
    rarity: "epic",
    flavor: "Massive surge that overwhelms all calming influences.",
    artAsset: "emoji:spike",
    effect: {
      kind: "typeModify",
      targetType: "Calm",
      delta: 2, // Counters calm cards
    },
  },

  // COMBO SET 1: "Cascading Calm" - Calm Type Strategic Combo
  {
    id: "hd_anxiety_spiral",
    name: "Anxiety Spiral",
    type: "Energy",
    value: 6,
    rarity: "epic",
    flavor: "Stress builds on itself, each worry feeding the next.",
    artAsset: "AnxietySpiral.png",
    effect: {
      kind: "conditionalModify",
      condition: "adjacentCount",
      delta: 2, // +2 for each adjacent card (creates tension)
    },
  },
  {
    id: "hd_breathing_technique",
    name: "Breathing Technique",
    type: "Calm",
    value: -1,
    rarity: "rare",
    flavor: "Slow, deep breaths that cascade peace to nearby tensions.",
    artAsset: "emoji:breath",
    effect: {
      kind: "typeModify",
      targetType: "Energy",
      delta: -3, // Specifically counters Energy cards
    },
  },

  // COMBO SET 2: "Nourishment Network" - Nourish Type Strategic Combo
  {
    id: "hd_empty_stomach",
    name: "Empty Stomach",
    type: "Rest",
    value: -4,
    rarity: "rare",
    flavor: "Hunger amplifies every nearby meal's impact.",
    artAsset: "emoji:empty",
    effect: {
      kind: "adjacentScale",
      factor: 1.5, // Amplifies adjacent cards by 50%
    },
  },
  {
    id: "hd_protein_power",
    name: "Protein Power",
    type: "Nourish",
    value: 3,
    rarity: "rare",
    flavor: "Steady energy that strengthens all nearby nourishment.",
    artAsset: "emoji:muscle",
    effect: {
      kind: "typeModify",
      targetType: "Nourish",
      delta: 1, // +1 to all Nourish cards
    },
  },
  {
    id: "hd_meal_timing",
    name: "Perfect Timing",
    type: "Nourish",
    value: 2,
    rarity: "epic",
    flavor: "When you eat matters as much as what you eat.",
    artAsset: "emoji:clock",
    effect: {
      kind: "conditionalModify",
      condition: "adjacentCount",
      delta: -1, // NEGATIVE delta - rewards sparse placement
    },
  },

  // COMBO SET 3: "Rest & Recovery" - Rest Type Strategic Combo
  {
    id: "hd_exhaustion",
    name: "Exhaustion",
    type: "Energy",
    value: 5,
    rarity: "rare",
    flavor: "Burnout that makes recovery twice as effective.",
    artAsset: "emoji:tired",
    effect: {
      kind: "typeModify",
      targetType: "Rest",
      delta: -2, // Makes Rest cards more powerful (more negative)
    },
  },
  {
    id: "hd_power_nap",
    name: "Power Nap",
    type: "Rest",
    value: -2,
    rarity: "common",
    flavor: "Short rest that rejuvenates without oversleeping.",
    artAsset: "emoji:nap",
    effect: {
      kind: "radiusModify",
      radius: 1,
      delta: -1, // Small area calming effect
    },
  },
  {
    id: "hd_sleep_debt",
    name: "Sleep Debt",
    type: "Rest",
    value: -1,
    rarity: "epic",
    flavor: "The deeper the deficit, the greater the eventual recovery.",
    artAsset: "emoji:debt",
    effect: {
      kind: "harmonyShift",
      harmonyDelta: -6, // Shifts harmony negative (sets up for Recovery)
    },
  },
  {
    id: "hd_recovery_mode",
    name: "Recovery Mode",
    type: "Rest",
    value: -1,
    rarity: "epic",
    flavor: "Body's natural bounce-back pulls everything toward balance.",
    artAsset: "emoji:recovery",
    effect: {
      kind: "globalScale",
      factor: 0.4, // Strong pull toward zero (60% reduction)
    },
  },

  // COMBO SET 4: "Energy Management" - Energy Type Strategic Combo
  {
    id: "hd_caffeine_crash",
    name: "Caffeine Crash",
    type: "Energy",
    value: 4,
    rarity: "rare",
    flavor: "Quick spike followed by weakening of surrounding energy.",
    artAsset: "emoji:crash",
    effect: {
      kind: "adjacentScale",
      factor: 0.7, // Weakens adjacent cards after the spike
    },
  },
  {
    id: "hd_steady_fuel",
    name: "Steady Fuel",
    type: "Nourish",
    value: 2,
    rarity: "rare",
    flavor: "Consistent energy that builds momentum over time.",
    artAsset: "emoji:fuel",
    effect: {
      kind: "pattern",
      pattern: [[0, -1], [0, 1], [1, 0], [-1, 0]], // Cross pattern
      delta: 1,
    },
  },

  // COMBO SET 5: "Anchor Manipulation" - Advanced Anchor Combos
  {
    id: "hd_wild_variable",
    name: "Wild Variable",
    type: "Anchor",
    value: 0,
    rarity: "epic",
    flavor: "Unpredictable factor that shifts the entire paradigm.",
    artAsset: "emoji:wild",
    effect: {
      kind: "harmonyShift",
      harmonyDelta: -10, // Large negative shift
    },
  },
  {
    id: "hd_system_reset",
    name: "System Reset",
    type: "Anchor",
    value: 0,
    rarity: "epic",
    flavor: "Complete recalibration brings everything back to baseline.",
    artAsset: "emoji:reset",
    effect: {
      kind: "globalScale",
      factor: 0.1, // Nearly eliminates all card effects (90% reduction)
    },
  },
  {
    id: "hd_momentum_builder",
    name: "Momentum Builder",
    type: "Anchor",
    value: 0,
    rarity: "rare",
    flavor: "Each connection amplifies the next, building unstoppable force.",
    artAsset: "emoji:momentum",
    effect: {
      kind: "conditionalModify",
      condition: "adjacentCount",
      delta: 3, // +3 per adjacent card - rewards clustering
    },
  },

  // DEFENSIVE/UTILITY CARDS
  {
    id: "hd_buffer_zone",
    name: "Buffer Zone",
    type: "Calm",
    value: -1,
    rarity: "rare",
    flavor: "Creates stable space that resists external influence.",
    artAsset: "emoji:shield",
    effect: {
      kind: "adjacentScale",
      factor: 0.8, // Dampens adjacent card effects by 20%
    },
  },
  {
    id: "hd_amplifier",
    name: "Amplifier",
    type: "Anchor",
    value: 0,
    rarity: "rare",
    flavor: "Technology that boosts the strength of nearby signals.",
    artAsset: "emoji:amp",
    effect: {
      kind: "adjacentScale",
      factor: 1.3, // Increases adjacent card effects by 30%
    },
  },
];

export const HARMONY_CARD_INDEX = HARMONY_STARTER_CARDS.reduce<Record<string, Card>>((map, card) => {
  map[card.id] = card;
  return map;
}, {});

export const DECK_SIZE = 20;
export const MAX_COPIES_PER_CARD = 3;

export const buildStarterDeck = (): string[] => {
  // Balanced 20-card starter deck with variety across all types
  return [
    // Energy cards (5)
    "hd_sensor_alert", "hd_midnight_snack", "hd_caffeine_crash", "hd_anxiety_spiral", "hd_glucose_spike",

    // Calm cards (4)
    "hd_morning_walk", "hd_breathing_technique", "hd_insulin_storm", "hd_buffer_zone",

    // Rest cards (4)
    "hd_evening_walk", "hd_deep_sleep", "hd_power_nap", "hd_recovery_mode",

    // Nourish cards (4)
    "hd_low_treat", "hd_hydrate", "hd_protein_power", "hd_steady_fuel",

    // Anchor cards (3)
    "hd_temp_basal", "hd_bolus_check", "hd_correction_bolus"
  ];
};

export const buildBalancedDeck = (): string[] => {
  // Alternative balanced deck focusing on synergies
  return [
    // Type synergy focus
    "hd_morning_walk", "hd_morning_walk", "hd_breathing_technique", "hd_buffer_zone", // Calm cluster
    "hd_protein_power", "hd_meal_timing", "hd_steady_fuel", "hd_fiber_plate", // Nourish cluster
    "hd_exhaustion", "hd_power_nap", "hd_sleep_debt", "hd_recovery_mode", // Rest combo
    "hd_sensor_alert", "hd_adrenaline_surge", "hd_interval_sprint", // Energy burst
    "hd_temp_basal", "hd_unexpected_swing", "hd_system_reset", "hd_momentum_builder", // Anchor manipulation
    "hd_heat_wave", "hd_amplifier" // Utility
  ];
};

export const isValidDeck = (cardIds: string[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (cardIds.length !== DECK_SIZE) {
    errors.push(`Deck must contain exactly ${DECK_SIZE} cards (currently ${cardIds.length})`);
  }

  // Check card copy limits
  const cardCounts = cardIds.reduce((counts, cardId) => {
    counts[cardId] = (counts[cardId] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  Object.entries(cardCounts).forEach(([cardId, count]) => {
    if (count > MAX_COPIES_PER_CARD) {
      const cardName = HARMONY_CARD_INDEX[cardId]?.name || cardId;
      errors.push(`Too many copies of "${cardName}" (${count}/${MAX_COPIES_PER_CARD})`);
    }
  });

  // Check if all cards exist
  cardIds.forEach(cardId => {
    if (!HARMONY_CARD_INDEX[cardId]) {
      errors.push(`Unknown card: ${cardId}`);
    }
  });

  return { valid: errors.length === 0, errors };
};
