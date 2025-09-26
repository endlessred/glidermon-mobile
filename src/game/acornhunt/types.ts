// Acorn Hunt game types and interfaces

export type StatKey = "STR" | "SPD" | "MAG" | "DEF" | "LCK";
export type Stats = Record<StatKey, number> & { HP: number; HPMax: number };

export type CharacterId =
  | "player"
  | "sable"
  | "luma"
  | "orvus"
  | "juno"
  | "moss"
  | "carmine"
  | "zippa"; // seasonal

export interface CharacterDef {
  id: CharacterId;
  name: string;
  emoji: string; // emoji representation for now
  base: Stats;
  moves: MoveId[];
  passive?: PassiveId;
  spineKey: string; // for future Spine integration
}

export type MoveId =
  // Base moves
  | "acorn_toss"
  | "hatpin_stab"
  | "shadow_juggle"
  | "sparkle_spit"
  | "petal_shield"
  | "glow_burst"
  | "wing_slam"
  | "blueprint_guard"
  | "taunt"
  | "protect"
  | "fortress_mode"
  | "miscalculation"
  | "token_toss"
  | "echo_strike"
  | "squawk_of_glory"
  | "lazy_swipe"
  | "nap_time"
  | "sloth_smash"
  | "dramatic_peck"
  | "fashion_pose"
  | "encore_performance"
  | "peck"
  | "inspire"
  | "gust"
  // Upgraded moves
  | "precision_strike"
  | "alpha_strike"
  | "rally"
  | "battle_cry"
  | "wind_wall"
  | "storm_call"
  | "shadow_bolt"
  | "void_strike"
  | "assassinate"
  | "shadow_clone"
  | "darkness_veil"
  | "shadow_storm"
  | "healing_rain"
  | "life_burst"
  | "nature_armor"
  | "sanctuary"
  | "cleansing_light"
  | "divine_radiance"
  // Enemy moves
  | "nibble"
  | "scurry"
  | "constrict"
  | "venom_spit"
  | "sticky_slap"
  | "blob"
  | "split"
  | "acorn_slam"
  | "armor_up"
  | "dark_spores"
  // New enemy moves
  | "swarm_call"
  | "ambush_strike"
  | "coil_defense"
  | "root_entangle"
  | "forest_rage";

export interface MoveDef {
  id: MoveId;
  name: string;
  kind: "attack" | "support" | "special";
  power?: number;
  statScale?: StatKey;
  target: "enemy" | "allEnemies" | "ally" | "allAllies" | "self";
  description: string;
  effect: (ctx: BattleContext) => BattleAction[];
  anim: { track: number; name: string; mix?: number };
}

export type PassiveId =
  | "sable_crit_bias"
  | "luma_post_battle_heal"
  | "orvus_guard"
  | "juno_bonus_acorns"
  | "moss_inconsistent"
  | "carmine_fabulous_crit"
  | "player_inspire";

export interface PassiveDef {
  id: PassiveId;
  name: string;
  description: string;
  apply: (ctx: BattleContext) => void;
}

export type RelicRarity = "common" | "uncommon" | "rare" | "legendary";

export interface RelicDef {
  id: string;
  name: string;
  rarity: RelicRarity;
  description: string;
  emoji: string; // emoji for now
  requires?: Partial<Stats>;
  apply: (run: RunState) => void;
  iconKey: string; // for future assets
}

export type NodeType = "battle" | "treasure" | "event" | "boss";

export interface MapNode {
  id: string;
  type: NodeType;
  title: string;
  description: string;
  next: string[];
  completed?: boolean;
  alternatives?: Array<{
    id: string;
    type: NodeType;
    title: string;
    description: string;
  }>;
}

export interface RunModifiers {
  damageMult: number;
  critChanceBonus: number;
  dodgeBonus: number;
  healPerTurn: number;
  postBattleHealPct: number;
  acornDropMult: number;
  statBonuses: Partial<Stats>;
  hooks: {
    onRoundStart?: (ctx: BattleContext) => void;
    onAttack?: (ctx: BattleContext) => void;
    onCrit?: (ctx: BattleContext) => void;
    onPostBattle?: (ctx: BattleContext) => void;
  };
}

export interface RunState {
  seed: number;
  party: CharacterId[];
  partyHP: Record<string, { current: number; max: number }>; // Track HP for each party member by ID
  relics: string[];
  modifiers: RunModifiers;
  map: MapNode[];
  nodeIndex: number;
  rewards: { acorns: number; shards: number; virtuAcorns: number };
  speed: 1 | 2 | 4;
  status: "active" | "complete" | "abandoned";
}

// Battle system types
export interface StatusEffect {
  id: string;
  name: string;
  stat?: StatKey;
  delta: number;
  ttl: number;
  description: string;
  // Tank move special properties
  forcedTarget?: string; // For taunt effects
  damageReduction?: number; // For protection effects (0.0-1.0)
  preventAttack?: boolean; // For fortress mode
}

export interface Combatant {
  id: string;
  character: CharacterDef;
  stats: Stats;
  statusEffects: StatusEffect[];
  isEnemy: boolean;
  lastAction?: string;
}

export interface BattleAction {
  type: "damage" | "heal" | "buff" | "debuff" | "special";
  source: string;
  target: string[];
  value: number;
  message: string;
  crit?: boolean;
  miss?: boolean;
  statusEffect?: StatusEffect;
  splitInto?: EnemyDef[]; // For splitting mechanics
}

export interface BattleContext {
  combatants: Combatant[];
  actions: BattleAction[];
  round: number;
  run: RunState;
  rng: () => number;
}

// Enemy types
export type EnemyId = "bark_beetle" | "branch_snake" | "sap_slime" | "hollow_acorn";

export interface EnemyDef {
  id: EnemyId;
  name: string;
  emoji: string;
  stats: Stats;
  moves: MoveId[];
  tier: "common" | "elite" | "boss";
  description: string;
  ai: "aggressive" | "defensive" | "random";
}

// Event types
export interface EventChoice {
  text: string;
  description?: string;
  effect: (run: RunState) => { message: string; acorns?: number; statChange?: Partial<Stats> };
}

export interface EventDef {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

// Character progression types
export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  prerequisites?: string[];
  effect: (character: CharacterDef, run: RunState) => void;
}

export interface SkillTree {
  characterId: CharacterId;
  branches: {
    [branchName: string]: {
      name: string;
      description: string;
      nodes: SkillNode[];
    };
  };
}

export interface MoveTier {
  id: MoveId;
  name: string;
  tier: 1 | 2 | 3;
  cost: number;
  upgradeFrom?: MoveId;
  description: string;
  effect: MoveDef;
}

export interface CharacterProgression {
  characterId: CharacterId;
  unlockedSkills: string[];
  currentMoves: MoveId[];
  masteryLevel: number;
  totalVirtuAcornsSpent: number;
}

export interface AcornHuntProgression {
  totalVirtuAcorns: number;
  spentVirtuAcorns: number;
  characterProgressions: Record<CharacterId, CharacterProgression>;
  unlockedCharacters: CharacterId[];
}

// UI state types
export interface AcornHuntUIState {
  currentScreen: "party_select" | "map" | "battle" | "treasure" | "event" | "results" | "progression";
  selectedCards?: string[];
  battleLog: BattleAction[];
  showSpeedControls: boolean;
}

// Utility types for asset requirements
export interface AssetRequirement {
  type: "spine" | "texture" | "audio";
  id: string;
  description: string;
  character?: CharacterId;
  priority: "high" | "medium" | "low";
}