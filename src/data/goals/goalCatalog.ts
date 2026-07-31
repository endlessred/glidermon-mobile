// data/goals/goalCatalog.ts
//
// Static catalog of diabetes-management goals shown as small cards on Home.
// goalsStore picks from this list to generate/refill the daily batch.

export type GoalCategory = "glucose_response" | "lifestyle";

export type GoalEligibilityContext = {
  mgdl: number | null;
  low: number;
  high: number;
  veryHigh: number;
};

export type GoalDef = {
  id: string;
  title: string;
  icon: string;           // phosphor-react-native icon name
  emojiFallback: string;  // shown if phosphor-react-native isn't available
  acorns: 5 | 10;
  category: GoalCategory;
  /** Omit for lifestyle goals that are always eligible. */
  isEligible?: (ctx: GoalEligibilityContext) => boolean;
};

export const GOAL_CATALOG: GoalDef[] = [
  // Glucose-response goals: only eligible while the condition is true.
  {
    id: "correct_low",
    title: "Correct a low",
    icon: "ArrowFatDown",
    emojiFallback: "⬇️",
    acorns: 10,
    category: "glucose_response",
    isEligible: (ctx) => ctx.mgdl != null && ctx.mgdl < ctx.low,
  },
  {
    id: "correct_high",
    title: "Correct a high",
    icon: "ArrowFatUp",
    emojiFallback: "⬆️",
    acorns: 10,
    category: "glucose_response",
    isEligible: (ctx) => ctx.mgdl != null && ctx.mgdl > ctx.high,
  },
  {
    id: "check_ketones",
    title: "Check ketones",
    icon: "Drop",
    emojiFallback: "💧",
    acorns: 10,
    category: "glucose_response",
    isEligible: (ctx) => ctx.mgdl != null && ctx.mgdl > ctx.veryHigh,
  },

  // Lifestyle goals: always eligible, generic day-to-day nudges.
  {
    id: "low_carb_snack",
    title: "Eat a low-carb snack",
    icon: "Carrot",
    emojiFallback: "🥕",
    acorns: 5,
    category: "lifestyle",
  },
  {
    id: "go_for_walk",
    title: "Go for a walk",
    icon: "PersonSimpleWalk",
    emojiFallback: "🚶",
    acorns: 5,
    category: "lifestyle",
  },
  {
    id: "hydrate",
    title: "Drink some water",
    icon: "Drop",
    emojiFallback: "💧",
    acorns: 5,
    category: "lifestyle",
  },
  {
    id: "log_a_meal",
    title: "Log a meal",
    icon: "ForkKnife",
    emojiFallback: "🍽️",
    acorns: 5,
    category: "lifestyle",
  },
  {
    id: "stretch_break",
    title: "Take a stretch break",
    icon: "Timer",
    emojiFallback: "🧘",
    acorns: 5,
    category: "lifestyle",
  },
  {
    id: "wind_down",
    title: "Wind down before bed",
    icon: "Bed",
    emojiFallback: "🛌",
    acorns: 5,
    category: "lifestyle",
  },
  {
    id: "mindful_treat",
    title: "Log a treat mindfully",
    icon: "Cookie",
    emojiFallback: "🍪",
    acorns: 5,
    category: "lifestyle",
  },
];

const GOAL_BY_ID = new Map(GOAL_CATALOG.map((g) => [g.id, g]));

export function getGoalDef(id: string): GoalDef | undefined {
  return GOAL_BY_ID.get(id);
}

function eligibleGoals(ctx: GoalEligibilityContext): GoalDef[] {
  return GOAL_CATALOG.filter((g) => !g.isEligible || g.isEligible(ctx));
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks `count` goals for a fresh daily batch: currently-eligible
 * glucose-response goals first (so an in-progress low/high always shows up),
 * then random lifestyle goals to fill the remaining slots.
 */
export function pickDailyGoals(ctx: GoalEligibilityContext, count: number): GoalDef[] {
  const eligible = eligibleGoals(ctx);
  const responseGoals = shuffled(eligible.filter((g) => g.category === "glucose_response"));
  const lifestyleGoals = shuffled(eligible.filter((g) => g.category === "lifestyle"));

  const picked: GoalDef[] = [];
  const usedIds = new Set<string>();
  for (const g of [...responseGoals, ...lifestyleGoals]) {
    if (picked.length >= count) break;
    if (usedIds.has(g.id)) continue;
    picked.push(g);
    usedIds.add(g.id);
  }
  return picked;
}

/**
 * Picks one replacement goal, preferring a currently-eligible option not
 * already active today. Falls back to any eligible goal (allowing repeats)
 * if every eligible goal is already in play.
 */
export function pickReplacementGoal(
  ctx: GoalEligibilityContext,
  excludeIds: string[]
): GoalDef | undefined {
  const exclude = new Set(excludeIds);
  const eligible = eligibleGoals(ctx);
  const fresh = shuffled(eligible.filter((g) => !exclude.has(g.id)));
  if (fresh.length > 0) return fresh[0];
  return shuffled(eligible)[0];
}
