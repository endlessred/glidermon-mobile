// Enemy definitions for Acorn Hunt
import { EnemyDef, EnemyId, MoveDef, MoveId, BattleContext, BattleAction } from './types';

// Enemy move definitions (separate from character moves)
export const ENEMY_MOVES: Record<string, MoveDef> = {
  // Bark Beetle moves
  nibble: {
    id: "nibble" as MoveId,
    name: "Nibble",
    kind: "attack",
    power: 14,
    statScale: "STR",
    target: "enemy",
    description: "A quick bite attack",
    effect: (ctx) => [{
      type: "damage",
      source: "", // Will be filled by processAction
      target: [], // Will be filled by selectTargets
      value: 14,
      message: "The beetle nibbles at you!"
    }],
    anim: { track: 1, name: "attack" }
  },

  scurry: {
    id: "scurry" as MoveId,
    name: "Scurry",
    kind: "support",
    target: "self",
    description: "Increases speed temporarily",
    effect: (ctx) => [{
      type: "buff",
      source: "", // Will be filled by processAction
      target: [], // Will be filled by selectTargets (self)
      value: 2,
      message: "The beetle scurries around frantically!",
      statusEffect: { id: "scurry", name: "Scurrying", stat: "SPD", delta: 2, ttl: 2, description: "+2 SPD" }
    }],
    anim: { track: 1, name: "support" }
  },

  // Branch Snake moves
  constrict: {
    id: "constrict" as MoveId,
    name: "Constrict",
    kind: "attack",
    power: 18,
    statScale: "STR",
    target: "enemy",
    description: "A powerful constricting attack",
    effect: (ctx) => [{
      type: "damage",
      source: "", // Will be filled by processAction
      target: [], // Will be filled by selectTargets
      value: 18,
      message: "The snake coils around you!"
    }],
    anim: { track: 1, name: "attack" }
  },

  venom_spit: {
    id: "venom_spit" as MoveId,
    name: "Venom Spit",
    kind: "attack",
    power: 10,
    statScale: "MAG",
    target: "enemy",
    description: "Poisonous spit that may stun",
    effect: (ctx) => {
      const actions: BattleAction[] = [{
        type: "damage",
        source: "", // Will be filled by processAction
        target: [], // Will be filled by selectTargets
        value: 10,
        message: "The snake spits venom!"
      }];

      // 20% chance to stun - will be checked during action processing
      // Note: The stun chance and SPD check will be handled in processDamage
      if (ctx.rng() < 0.2) {
        actions.push({
          type: "debuff",
          source: "", // Will be filled by processAction
          target: [], // Will be filled by selectTargets
          value: 0,
          message: "You are stunned by the venom!",
          statusEffect: { id: "stun", name: "Stunned", delta: 0, ttl: 1, description: "Cannot act" }
        });
      }

      return actions;
    },
    anim: { track: 1, name: "attack" }
  },

  // Sap Slime moves
  sticky_slap: {
    id: "sticky_slap" as MoveId,
    name: "Sticky Slap",
    kind: "attack",
    power: 15,
    statScale: "STR",
    target: "enemy",
    description: "Powerful attack that always slows the target",
    effect: (ctx) => [
      {
        type: "damage",
        source: "", // Will be filled by processAction
        target: [], // Will be filled by selectTargets
        value: 15,
        message: "The slime slaps you with sticky appendages!"
      },
      {
        type: "debuff",
        source: "", // Will be filled by processAction
        target: [], // Will be filled by selectTargets
        value: -2,
        message: "You're slowed by the sticky goo!",
        statusEffect: { id: "goo", name: "Sticky", stat: "SPD", delta: -2, ttl: 2, description: "-2 SPD for 2 turns" }
      }
    ],
    anim: { track: 1, name: "attack" }
  },

  blob: {
    id: "blob" as MoveId,
    name: "Blob",
    kind: "support",
    target: "self",
    description: "Reforms and heals substantially",
    effect: (ctx) => [{
      type: "heal",
      source: "", // Will be filled by processAction
      target: [], // Will be filled by selectTargets
      value: 25,
      message: "The slime reforms itself, regenerating significantly!"
    }],
    anim: { track: 1, name: "support" }
  },

  split: {
    id: "split" as MoveId,
    name: "Split",
    kind: "special",
    target: "self",
    description: "Splits into smaller slimes when badly wounded",
    effect: (ctx) => {
      const slime = ctx.combatants.find(c => c.id.includes("sap_slime"));
      if (!slime || slime.stats.HP > slime.stats.HPMax * 0.25) {
        // Only split when HP is below 25%
        return [{
          type: "special",
          source: "", // Will be filled by processAction
          target: [],
          value: 0,
          message: "The slime writhes but holds together!"
        }];
      }

      // Split into 2 smaller slimes
      return [{
        type: "special",
        source: "sap_slime",
        target: [],
        value: 0,
        message: "The slime splits into two smaller forms!",
        splitInto: [
          {
            id: "sap_slime_small_1",
            name: "Small Slime",
            emoji: "🟤💧",
            stats: { STR: 5, SPD: 5, MAG: 3, DEF: 6, LCK: 2, HP: 40, HPMax: 40 },
            moves: ["sticky_slap"],
            tier: "common" as const,
            description: "A smaller piece of the original slime",
            ai: "aggressive" as const
          },
          {
            id: "sap_slime_small_2",
            name: "Small Slime",
            emoji: "🟤💧",
            stats: { STR: 5, SPD: 5, MAG: 3, DEF: 6, LCK: 2, HP: 40, HPMax: 40 },
            moves: ["sticky_slap"],
            tier: "common" as const,
            description: "A smaller piece of the original slime",
            ai: "aggressive" as const
          }
        ]
      }];
    },
    anim: { track: 2, name: "special" }
  },

  // Hollow Acorn Boss moves
  acorn_slam: {
    id: "acorn_slam" as MoveId,
    name: "Acorn Slam",
    kind: "attack",
    power: 18,
    statScale: "STR",
    target: "allEnemies",
    description: "Powerful AoE slam attack",
    effect: (ctx) => [{
      type: "damage",
      source: "hollow_acorn",
      target: ctx.combatants.filter(c => !c.isEnemy).map(c => c.id),
      value: 18,
      message: "The Hollow Acorn slams the ground with tremendous force!"
    }],
    anim: { track: 2, name: "special" }
  },

  armor_up: {
    id: "armor_up" as MoveId,
    name: "Armor Up",
    kind: "support",
    target: "self",
    description: "Increases defense temporarily",
    effect: (ctx) => [{
      type: "buff",
      source: "hollow_acorn",
      target: ["hollow_acorn"],
      value: 4,
      message: "The Hollow Acorn's shell hardens!",
      statusEffect: { id: "armored", name: "Armored Shell", stat: "DEF", delta: 4, ttl: 3, description: "+4 DEF" }
    }],
    anim: { track: 1, name: "support" }
  },

  dark_spores: {
    id: "dark_spores" as MoveId,
    name: "Dark Spores",
    kind: "attack",
    power: 12,
    statScale: "MAG",
    target: "allEnemies",
    description: "Releases poisonous spores",
    effect: (ctx) => [
      {
        type: "damage",
        source: "hollow_acorn",
        target: ctx.combatants.filter(c => !c.isEnemy).map(c => c.id),
        value: 12,
        message: "Dark spores fill the air!"
      },
      {
        type: "debuff",
        source: "hollow_acorn",
        target: ctx.combatants.filter(c => !c.isEnemy).map(c => c.id),
        value: -1,
        message: "The spores weaken your defenses!",
        statusEffect: { id: "poison", name: "Poisoned", stat: "DEF", delta: -1, ttl: 2, description: "-1 DEF" }
      }
    ],
    anim: { track: 2, name: "special" }
  },

  // === NEW ENHANCED ENEMY MOVES ===

  // Bark Beetle - Swarm Call (summons backup)
  swarm_call: {
    id: "swarm_call" as MoveId,
    name: "Swarm Call",
    kind: "special",
    target: "self",
    description: "Calls for backup when weakened",
    effect: (ctx) => {
      const beetle = ctx.combatants.find(c => c.character.name === "Bark Beetle");
      const currentEnemies = ctx.combatants.filter(c => c.isEnemy && c.stats.HP > 0).length;

      // Only summon if beetle is below 75% HP and there are 2 or fewer enemies
      if (beetle && beetle.stats.HP < beetle.stats.HPMax * 0.75 && currentEnemies <= 2) {
        return [{
          type: "special",
          source: "",
          target: [],
          value: 0,
          message: "The beetle calls for backup! Another beetle arrives!",
          splitInto: [
            {
              id: "bark_beetle_swarm",
              name: "Swarming Beetle",
              emoji: "🪲🌳",
              stats: { STR: 5, SPD: 9, MAG: 1, DEF: 3, LCK: 3, HP: 45, HPMax: 45 },
              moves: ["nibble"],
              tier: "common" as const,
              description: "A smaller, agile beetle",
              ai: "aggressive" as const
            }
          ]
        }];
      }

      return [{
        type: "buff",
        source: "",
        target: [],
        value: 2,
        message: "The beetle chirps defiantly!",
        statusEffect: { id: "motivated", name: "Motivated", stat: "STR", delta: 2, ttl: 3, description: "+2 STR" }
      }];
    },
    anim: { track: 1, name: "support" }
  },

  // Branch Snake - Ambush Strike (high damage first-turn move)
  ambush_strike: {
    id: "ambush_strike" as MoveId,
    name: "Ambush Strike",
    kind: "attack",
    power: 20,
    statScale: "STR",
    target: "enemy",
    description: "Devastating surprise attack, only usable early in battle",
    effect: (ctx) => [{
      type: "damage",
      source: "",
      target: [],
      value: 20,
      message: "The snake strikes from the shadows with deadly precision!"
    }],
    anim: { track: 2, name: "special" }
  },

  // Branch Snake - Coil Defense (defensive stance)
  coil_defense: {
    id: "coil_defense" as MoveId,
    name: "Coil Defense",
    kind: "support",
    target: "self",
    description: "Coils up defensively, reducing damage taken",
    effect: (ctx) => [{
      type: "buff",
      source: "",
      target: [],
      value: 5,
      message: "The snake coils defensively, hardening its scales!",
      statusEffect: { id: "coiled", name: "Coiled Defense", stat: "DEF", delta: 5, ttl: 4, description: "+5 DEF" }
    }],
    anim: { track: 1, name: "support" }
  },

  // Hollow Acorn - Root Entangle (area control)
  root_entangle: {
    id: "root_entangle" as MoveId,
    name: "Root Entangle",
    kind: "attack",
    power: 8,
    statScale: "MAG",
    target: "allEnemies",
    description: "Roots burst from the ground to entangle all foes",
    effect: (ctx) => [
      {
        type: "damage",
        source: "",
        target: [],
        value: 8,
        message: "Twisted roots burst from the earth!"
      },
      {
        type: "debuff",
        source: "",
        target: [],
        value: -3,
        message: "You're entangled by the roots!",
        statusEffect: { id: "entangled", name: "Root Bound", stat: "SPD", delta: -3, ttl: 3, description: "-3 SPD" }
      }
    ],
    anim: { track: 2, name: "special" }
  },

  // Hollow Acorn - Forest Rage (escalating boss mechanic)
  forest_rage: {
    id: "forest_rage" as MoveId,
    name: "Forest Rage",
    kind: "special",
    target: "self",
    description: "Channel ancient forest fury, growing stronger as HP decreases",
    effect: (ctx) => {
      const acorn = ctx.combatants.find(c => c.character.name === "Hollow Acorn");
      if (!acorn) return [];

      const hpPercent = acorn.stats.HP / acorn.stats.HPMax;
      const rageLevel = hpPercent < 0.3 ? 3 : hpPercent < 0.6 ? 2 : 1;

      return [{
        type: "buff",
        source: "",
        target: [],
        value: rageLevel * 2,
        message: `The Hollow Acorn channels ancient rage! (Level ${rageLevel})`,
        statusEffect: {
          id: "forest_rage",
          name: `Forest Rage ${rageLevel}`,
          stat: "STR",
          delta: rageLevel * 2,
          ttl: 5,
          description: `+${rageLevel * 2} STR`
        }
      }];
    },
    anim: { track: 2, name: "special" }
  }
};

// Enemy definitions with enhanced AI and mechanics
export const ENEMIES: Record<EnemyId, EnemyDef> = {
  bark_beetle: {
    id: "bark_beetle",
    name: "Bark Beetle",
    emoji: "🪲🌳", // beetle with tree
    stats: { STR: 7, SPD: 8, MAG: 2, DEF: 4, LCK: 4, HP: 70, HPMax: 70 },
    moves: ["nibble", "scurry", "swarm_call"],
    tier: "common",
    description: "A small but persistent forest pest that calls for backup",
    ai: "aggressive"
  },

  branch_snake: {
    id: "branch_snake",
    name: "Branch Snake",
    emoji: "🐍🌿", // snake with leaves
    stats: { STR: 10, SPD: 9, MAG: 6, DEF: 7, LCK: 5, HP: 95, HPMax: 95 },
    moves: ["constrict", "venom_spit", "ambush_strike", "coil_defense"],
    tier: "elite",
    description: "A cunning serpent that adapts its tactics mid-battle",
    ai: "defensive"
  },

  sap_slime: {
    id: "sap_slime",
    name: "Sap Slime",
    emoji: "🟤💧", // brown droplet
    stats: { STR: 7, SPD: 4, MAG: 5, DEF: 9, LCK: 3, HP: 120, HPMax: 120 },
    moves: ["sticky_slap", "blob", "split"],
    tier: "common",
    description: "A slow but resilient creature made of tree sap",
    ai: "defensive"
  },

  hollow_acorn: {
    id: "hollow_acorn",
    name: "Hollow Acorn",
    emoji: "🌰👹", // acorn with evil face
    stats: { STR: 12, SPD: 5, MAG: 9, DEF: 10, LCK: 6, HP: 160, HPMax: 160 },
    moves: ["acorn_slam", "armor_up", "dark_spores", "root_entangle", "forest_rage"],
    tier: "boss",
    description: "A massive corrupted acorn vessel for ancient forest hatred",
    ai: "aggressive"
  }
};

// AI behavior functions
export const EnemyAI = {
  // Aggressive AI: Prefers attacks, uses specials when low on HP
  aggressive: (enemy: any, allies: any[], enemies: any[], rng: () => number): MoveDef => {
    const moves = enemy.character.moves.map((moveId: string) => ENEMY_MOVES[moveId]).filter(Boolean);
    if (moves.length === 0) return ENEMY_MOVES.nibble; // Fallback

    // If low on HP (< 30%), prefer special moves
    const hpPercent = enemy.stats.HP / enemy.stats.HPMax;
    if (hpPercent < 0.3) {
      const specialMoves = moves.filter(move => move.kind === "special");
      if (specialMoves.length > 0) {
        return rng() < 0.7 ? rng.choose(specialMoves) : rng.choose(moves);
      }
    }

    // Prefer attack moves
    const attackMoves = moves.filter(move => move.kind === "attack");
    if (attackMoves.length > 0 && rng() < 0.8) {
      return rng.choose(attackMoves);
    }

    return rng.choose(moves);
  },

  // Defensive AI: Uses support moves more often, attacks when safe
  defensive: (enemy: any, allies: any[], enemies: any[], rng: () => number): MoveDef => {
    const moves = enemy.character.moves.map((moveId: string) => ENEMY_MOVES[moveId]).filter(Boolean);
    if (moves.length === 0) return ENEMY_MOVES.nibble; // Fallback

    // If healthy (> 70%), consider support moves
    const hpPercent = enemy.stats.HP / enemy.stats.HPMax;
    if (hpPercent > 0.7) {
      const supportMoves = moves.filter(move => move.kind === "support");
      if (supportMoves.length > 0 && rng() < 0.4) {
        return rng.choose(supportMoves);
      }
    }

    // If very low HP (< 20%), prioritize healing
    if (hpPercent < 0.2) {
      const healMoves = moves.filter(move =>
        move.kind === "support" && move.description.toLowerCase().includes("heal")
      );
      if (healMoves.length > 0 && rng() < 0.6) {
        return rng.choose(healMoves);
      }
    }

    // Default to attack moves
    const attackMoves = moves.filter(move => move.kind === "attack");
    return attackMoves.length > 0 ? rng.choose(attackMoves) : rng.choose(moves);
  },

  // Random AI: Completely random move selection
  random: (enemy: any, allies: any[], enemies: any[], rng: () => number): MoveDef => {
    const moves = enemy.character.moves.map((moveId: string) => ENEMY_MOVES[moveId]).filter(Boolean);
    return moves.length > 0 ? rng.choose(moves) : ENEMY_MOVES.nibble;
  }
};

// Helper functions
export const getEnemyDef = (id: EnemyId): EnemyDef => {
  return ENEMIES[id];
};

export const getEnemiesByTier = (tier: "common" | "elite" | "boss"): EnemyDef[] => {
  return Object.values(ENEMIES).filter(enemy => enemy.tier === tier);
};

export const selectRandomEnemies = (tier: "common" | "elite" | "boss", count: number, rng: () => number): EnemyDef[] => {
  const available = getEnemiesByTier(tier);
  const selected: EnemyDef[] = [];

  for (let i = 0; i < count && available.length > 0; i++) {
    const index = Math.floor(rng() * available.length);
    selected.push(available[index]);
    // Don't remove from available to allow duplicates if needed
  }

  return selected;
};

// Create encounter based on node ID for structured difficulty
export const generateEncounter = (nodeIndex: number, totalNodes: number, rng: () => number, nodeId?: string): EnemyDef[] => {
  // Use nodeId if provided, otherwise fall back to index-based detection
  const battleNumber = nodeId ? getBattleNumberFromNodeId(nodeId) : getBattleFromNodeIndex(nodeIndex, totalNodes);

  console.log(`🎮 Generating encounter for battle ${battleNumber} (nodeId: ${nodeId}, nodeIndex: ${nodeIndex})`);

  switch (battleNumber) {
    case 1: // Battle 1 - Easy (1-2 weak enemies)
      const battle1 = rng() < 0.7 ?
        selectRandomEnemies("common", 1, rng) :
        selectRandomEnemies("common", 2, rng);
      console.log(`   ⚔️ Battle 1: ${battle1.length} common enemies`);
      return battle1;

    case 2: // Battle 2 - Medium-Easy (2 enemies, chance of elite)
      const battle2 = rng() < 0.3 ?
        selectRandomEnemies("elite", 1, rng) :
        selectRandomEnemies("common", 2, rng);
      console.log(`   ⚔️ Battle 2: ${battle2.some(e => e.tier === 'elite') ? '1 elite' : '2 common'} enemies`);
      return battle2;

    case 3: // Battle 3 - Medium-Hard (2-3 enemies, higher elite chance)
      let battle3: EnemyDef[];
      if (rng() < 0.5) {
        // Elite + minion
        const elites = selectRandomEnemies("elite", 1, rng);
        const minions = selectRandomEnemies("common", 1, rng);
        battle3 = [...elites, ...minions];
        console.log(`   ⚔️ Battle 3: 1 elite + 1 common enemy`);
      } else {
        // 3 common enemies
        battle3 = selectRandomEnemies("common", 3, rng);
        console.log(`   ⚔️ Battle 3: 3 common enemies`);
      }
      return battle3;

    case 4: // Battle 4 - Hard (3 enemies with guaranteed elite)
      const elites = selectRandomEnemies("elite", 1, rng);
      const minions = selectRandomEnemies("common", 2, rng);
      console.log(`   ⚔️ Battle 4: 1 elite + 2 common enemies`);
      return [...elites, ...minions];

    case 5: // Boss fight
      console.log(`   ⚔️ Boss Fight: Hollow Acorn + Bark Beetle`);
      return [ENEMIES.hollow_acorn, ENEMIES.bark_beetle];

    default: // Fallback for any other nodes
      console.log(`   ⚔️ Fallback: 1 common enemy`);
      return selectRandomEnemies("common", 1, rng);
  }
};

// Helper function to determine battle number from node ID
function getBattleNumberFromNodeId(nodeId: string): number {
  if (nodeId === 'boss') return 5;
  if (nodeId.startsWith('battle_')) {
    const num = parseInt(nodeId.split('_')[1]);
    return isNaN(num) ? 1 : num;
  }
  return 1; // Default to battle 1
}

// Helper function to determine battle number from node structure (fallback)
function getBattleFromNodeIndex(nodeIndex: number, totalNodes: number): number {
  if (nodeIndex === totalNodes - 1) {
    return 5; // Boss
  }

  // Estimate battle number based on progress
  const battleNumber = Math.floor(nodeIndex / 2) + 1;
  return Math.min(battleNumber, 4);
}

// Get move definition for enemy AI
export const getEnemyMove = (moveId: string): MoveDef | null => {
  return ENEMY_MOVES[moveId] || null;
};

// Execute enemy AI to choose next move
export const chooseEnemyMove = (
  enemy: any,
  allies: any[],
  enemies: any[],
  rng: () => number
): MoveDef => {
  const aiFunction = EnemyAI[enemy.character.ai] || EnemyAI.random;
  return aiFunction(enemy, allies, enemies, rng);
};