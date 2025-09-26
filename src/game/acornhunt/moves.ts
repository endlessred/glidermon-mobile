// Move definitions and progression system for Acorn Hunt
import { MoveDef, MoveId, MoveTier, BattleContext, BattleAction, CharacterId } from './types';

// Helper function to create basic attack moves
const createAttackMove = (
  id: MoveId,
  name: string,
  power: number,
  target: MoveDef['target'] = "enemy",
  description: string
): MoveDef => ({
  id,
  name,
  kind: "attack",
  power,
  statScale: "STR",
  target,
  description,
  effect: (ctx: BattleContext) => {
    // Find the source combatant - try from recent action first, fallback to finding who has this move
    let source = ctx.actions.length > 0 ? ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source) : null;
    if (!source) {
      // Fallback: find the combatant who has this move (for when context actions is empty)
      source = ctx.combatants.find(c => !c.isEnemy && c.character.moves.includes(id)) ||
               ctx.combatants.find(c => c.character.moves.includes(id));
    }
    if (!source) return [];

    const targets = ctx.combatants.filter(c =>
      target === "enemy" ? c.isEnemy !== source.isEnemy :
      target === "ally" ? c.isEnemy === source.isEnemy && c.id !== source.id :
      target === "self" ? c.id === source.id :
      target === "allEnemies" ? c.isEnemy !== source.isEnemy :
      target === "allAllies" ? c.isEnemy === source.isEnemy :
      false
    );

    return targets.map(target => ({
      type: "damage" as const,
      source: source.id,
      target: [target.id],
      value: Math.floor(power * (source.stats.STR / 10)),
      message: `${source.character.name} uses ${name}!`
    }));
  },
  anim: { track: 0, name: "attack" }
});

// Helper function to create support moves
const createSupportMove = (
  id: MoveId,
  name: string,
  target: MoveDef['target'],
  description: string,
  effect: MoveDef['effect']
): MoveDef => ({
  id,
  name,
  kind: "support",
  target,
  description,
  effect,
  anim: { track: 0, name: "support" }
});

// Base Player Moves
export const PLAYER_MOVES: Record<MoveId, MoveDef> = {
  // Glider moves
  peck: createAttackMove("peck", "Peck", 8, "enemy", "Basic pecking attack"),
  precision_strike: createAttackMove("precision_strike", "Precision Strike", 12, "enemy", "More accurate and powerful peck"),
  alpha_strike: createAttackMove("alpha_strike", "Alpha Strike", 20, "enemy", "Devastating leadership strike"),

  inspire: createSupportMove(
    "inspire",
    "Inspire",
    "allAllies",
    "Boost team morale and stats",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy);
      return allies.map(ally => ({
        type: "buff" as const,
        source: source.id,
        target: [ally.id],
        value: 1,
        message: `${ally.character.name} feels inspired!`,
        statusEffect: {
          id: "inspired",
          name: "Inspired",
          stat: "STR" as const,
          delta: 1,
          ttl: 3,
          description: "+1 STR for 3 turns"
        }
      }));
    }
  ),

  rally: createSupportMove(
    "rally",
    "Rally",
    "allAllies",
    "Stronger team inspiration",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy);
      return allies.map(ally => ({
        type: "buff" as const,
        source: source.id,
        target: [ally.id],
        value: 2,
        message: `${ally.character.name} is rallied!`,
        statusEffect: {
          id: "rallied",
          name: "Rallied",
          stat: "STR" as const,
          delta: 2,
          ttl: 4,
          description: "+2 STR for 4 turns"
        }
      }));
    }
  ),

  battle_cry: createSupportMove(
    "battle_cry",
    "Battle Cry",
    "allAllies",
    "Powerful war cry that empowers the entire team",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy);
      return allies.flatMap(ally => [
        {
          type: "buff" as const,
          source: source.id,
          target: [ally.id],
          value: 3,
          message: `${ally.character.name} is empowered by the battle cry!`,
          statusEffect: {
            id: "battle_ready",
            name: "Battle Ready",
            stat: "STR" as const,
            delta: 3,
            ttl: 5,
            description: "+3 STR for 5 turns"
          }
        },
        {
          type: "buff" as const,
          source: source.id,
          target: [ally.id],
          value: 2,
          message: "",
          statusEffect: {
            id: "battle_speed",
            name: "Battle Speed",
            stat: "SPD" as const,
            delta: 2,
            ttl: 5,
            description: "+2 SPD for 5 turns"
          }
        }
      ]);
    }
  ),

  gust: createAttackMove("gust", "Gust", 6, "allEnemies", "Wind attack hitting all enemies"),
  wind_wall: createSupportMove(
    "wind_wall",
    "Wind Wall",
    "allAllies",
    "Create protective wind barrier",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy);
      return allies.map(ally => ({
        type: "buff" as const,
        source: source.id,
        target: [ally.id],
        value: 3,
        message: `${ally.character.name} is protected by wind!`,
        statusEffect: {
          id: "wind_shield",
          name: "Wind Shield",
          stat: "DEF" as const,
          delta: 3,
          ttl: 3,
          description: "+3 DEF for 3 turns"
        }
      }));
    }
  ),

  storm_call: createAttackMove("storm_call", "Storm Call", 15, "allEnemies", "Devastating storm attack"),

  // Sable moves
  acorn_toss: createAttackMove("acorn_toss", "Acorn Toss", 7, "enemy", "Throw an acorn with precision"),
  shadow_bolt: createAttackMove("shadow_bolt", "Shadow Bolt", 11, "enemy", "Dark energy projectile"),
  void_strike: createAttackMove("void_strike", "Void Strike", 18, "enemy", "Devastating shadow attack"),

  hatpin_stab: createAttackMove("hatpin_stab", "Hatpin Stab", 9, "enemy", "Quick stabbing attack"),
  assassinate: createAttackMove("assassinate", "Assassinate", 16, "enemy", "Critical focused strike"),
  shadow_clone: createAttackMove("shadow_clone", "Shadow Clone", 12, "enemy", "Attack multiple times with shadows"),

  shadow_juggle: createAttackMove("shadow_juggle", "Shadow Juggle", 5, "allEnemies", "Juggle shadow orbs at enemies"),
  darkness_veil: createSupportMove(
    "darkness_veil",
    "Darkness Veil",
    "self",
    "Become harder to hit",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      return [{
        type: "buff" as const,
        source: source.id,
        target: [source.id],
        value: 50,
        message: `${source.character.name} fades into shadows!`,
        statusEffect: {
          id: "stealth",
          name: "Stealth",
          stat: "SPD" as const,
          delta: 5,
          ttl: 2,
          description: "Much harder to hit, +5 SPD"
        }
      }];
    }
  ),
  shadow_storm: createAttackMove("shadow_storm", "Shadow Storm", 20, "allEnemies", "Massive area shadow attack"),

  // Luma moves
  sparkle_spit: createAttackMove("sparkle_spit", "Sparkle Spit", 6, "enemy", "Magical sparkle attack"),
  healing_rain: createSupportMove(
    "healing_rain",
    "Healing Rain",
    "allAllies",
    "Gentle healing rain (25% HP + MAG scaling)",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      // Only heal allies who are actually wounded
      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy && c.stats.HP < c.stats.HPMax);
      if (allies.length === 0) {
        // Return a neutral message if no one needs healing
        return [{
          type: "heal" as const,
          source: source.id,
          target: [source.id],
          value: 0,
          message: `${source.character.name} casts healing rain, but no one needs healing.`
        }];
      }

      return allies.map(ally => {
        const baseHeal = Math.floor(ally.stats.HPMax * 0.25);
        const magBonus = Math.floor(source.stats.MAG * 2); // MAG scaling
        const totalHeal = baseHeal + magBonus;

        return {
          type: "heal" as const,
          source: source.id,
          target: [ally.id],
          value: totalHeal,
          message: `${ally.character.name} is healed by the rain! (+${totalHeal} HP)`
        };
      });
    }
  ),
  life_burst: createSupportMove(
    "life_burst",
    "Life Burst",
    "allAllies",
    "Powerful healing burst (40% HP + MAG scaling)",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy);
      return allies.map(ally => {
        const baseHeal = Math.floor(ally.stats.HPMax * 0.4);
        const magBonus = Math.floor(source.stats.MAG * 3); // Higher MAG scaling for tier 2
        const totalHeal = baseHeal + magBonus;

        return {
          type: "heal" as const,
          source: source.id,
          target: [ally.id],
          value: totalHeal,
          message: `${ally.character.name} is revitalized by life energy! (+${totalHeal} HP)`
        };
      });
    }
  ),

  petal_shield: createSupportMove(
    "petal_shield",
    "Petal Shield",
    "ally",
    "Protect an ally with flower petals",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy && c.id !== source.id);
      if (allies.length === 0) return [];

      const target = allies[0]; // For now, target first ally
      return [{
        type: "buff" as const,
        source: source.id,
        target: [target.id],
        value: 2,
        message: `${target.character.name} is protected by petals!`,
        statusEffect: {
          id: "petal_shield",
          name: "Petal Shield",
          stat: "DEF" as const,
          delta: 2,
          ttl: 4,
          description: "+2 DEF for 4 turns"
        }
      }];
    }
  ),

  glow_burst: createAttackMove("glow_burst", "Glow Burst", 8, "enemy", "Bright magical attack"),

  // Tank moves - Orvus
  wing_slam: createAttackMove("wing_slam", "Wing Slam", 10, "enemy", "Defensive strike that generates threat"),
  blueprint_guard: createSupportMove(
    "blueprint_guard",
    "Blueprint Guard",
    "allAllies",
    "Strategic defensive positioning (+3 DEF to all allies)",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy);
      return allies.map(ally => ({
        type: "buff" as const,
        source: source.id,
        target: [ally.id],
        value: 3,
        message: `${ally.character.name} takes strategic cover!`,
        statusEffect: {
          id: "defended",
          name: "Blueprint Defense",
          stat: "DEF" as const,
          delta: 3,
          ttl: 3,
          description: "+3 DEF for 3 turns"
        }
      }));
    }
  ),

  // New tank abilities
  taunt: createSupportMove(
    "taunt",
    "Taunt",
    "allEnemies",
    "Force enemies to target the tank",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const enemies = ctx.combatants.filter(c => c.isEnemy !== source.isEnemy);
      return enemies.map(enemy => ({
        type: "debuff" as const,
        source: source.id,
        target: [enemy.id],
        value: 0,
        message: `${enemy.character.name} is taunted by ${source.character.name}!`,
        statusEffect: {
          id: "taunted",
          name: "Taunted",
          stat: "STR" as const,
          delta: 0,
          ttl: 3,
          description: "Must attack the taunter for 3 turns"
        }
      }));
    }
  ),

  protect: createSupportMove(
    "protect",
    "Protect",
    "ally",
    "Shield an ally from the next attack",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      // Find the ally with lowest HP percentage
      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy && c.id !== source.id && c.stats.HP > 0);
      if (allies.length === 0) return [];

      const weakestAlly = allies.reduce((weakest, ally) => {
        const currentHPPercent = ally.stats.HP / ally.stats.HPMax;
        const weakestHPPercent = weakest.stats.HP / weakest.stats.HPMax;
        return currentHPPercent < weakestHPPercent ? ally : weakest;
      });

      return [{
        type: "buff" as const,
        source: source.id,
        target: [weakestAlly.id],
        value: 0,
        message: `${source.character.name} shields ${weakestAlly.character.name}!`,
        statusEffect: {
          id: "protected",
          name: "Protected",
          stat: "DEF" as const,
          delta: 0,
          ttl: 2,
          description: "Next attack redirected to protector"
        }
      }];
    }
  ),

  fortress_mode: createSupportMove(
    "fortress_mode",
    "Fortress Mode",
    "self",
    "Become an immovable defensive wall",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      return [{
        type: "buff" as const,
        source: source.id,
        target: [source.id],
        value: 0,
        message: `${source.character.name} enters fortress mode!`,
        statusEffect: {
          id: "fortress",
          name: "Fortress Mode",
          stat: "DEF" as const,
          delta: 6,
          ttl: 3,
          description: "+6 DEF, -50% damage taken, cannot move"
        }
      }];
    }
  ),
  miscalculation: createAttackMove("miscalculation", "Miscalculation", 6, "enemy", "Confusing attack that debuffs"),

  token_toss: createAttackMove("token_toss", "Token Toss", 7, "enemy", "Throw valuable tokens"),
  echo_strike: createAttackMove("echo_strike", "Echo Strike", 8, "enemy", "Sound-based attack"),
  squawk_of_glory: createSupportMove(
    "squawk_of_glory",
    "Squawk of Glory",
    "allAllies",
    "Inspiring battle cry",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy);
      return allies.map(ally => ({
        type: "buff" as const,
        source: source.id,
        target: [ally.id],
        value: 2,
        message: `${ally.character.name} feels glorious!`,
        statusEffect: {
          id: "glory",
          name: "Glory",
          stat: "LCK" as const,
          delta: 2,
          ttl: 3,
          description: "+2 LCK for 3 turns"
        }
      }));
    }
  ),

  lazy_swipe: createAttackMove("lazy_swipe", "Lazy Swipe", 12, "enemy", "Slow but powerful attack"),
  nap_time: createSupportMove(
    "nap_time",
    "Nap Time",
    "self",
    "Take a quick nap to restore energy",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      return [{
        type: "heal" as const,
        source: source.id,
        target: [source.id],
        value: Math.floor(source.stats.HPMax * 0.3),
        message: `${source.character.name} takes a refreshing nap!`
      }];
    }
  ),
  sloth_smash: createAttackMove("sloth_smash", "Sloth Smash", 18, "enemy", "Devastating slow attack"),

  dramatic_peck: createAttackMove("dramatic_peck", "Dramatic Peck", 8, "enemy", "Theatrical pecking attack"),
  fashion_pose: createSupportMove(
    "fashion_pose",
    "Fashion Pose",
    "self",
    "Strike a pose to boost confidence",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      return [{
        type: "buff" as const,
        source: source.id,
        target: [source.id],
        value: 3,
        message: `${source.character.name} strikes a fabulous pose!`,
        statusEffect: {
          id: "fabulous",
          name: "Fabulous",
          stat: "LCK" as const,
          delta: 3,
          ttl: 4,
          description: "+3 LCK for 4 turns"
        }
      }];
    }
  ),
  encore_performance: createSupportMove(
    "encore_performance",
    "Encore Performance",
    "allAllies",
    "Inspiring performance for the team",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy);
      return allies.map(ally => ({
        type: "buff" as const,
        source: source.id,
        target: [ally.id],
        value: 2,
        message: `${ally.character.name} is inspired by the performance!`,
        statusEffect: {
          id: "inspired_performance",
          name: "Inspired",
          stat: "MAG" as const,
          delta: 2,
          ttl: 3,
          description: "+2 MAG for 3 turns"
        }
      }));
    }
  ),

  // Tank protection moves
  taunt: createSupportMove(
    "taunt",
    "Taunt",
    "allEnemies",
    "Forces enemies to target the user",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      const enemies = ctx.combatants.filter(c => c.isEnemy !== source.isEnemy);
      return enemies.map(enemy => ({
        type: "debuff" as const,
        source: source.id,
        target: [enemy.id],
        value: 0,
        message: `${enemy.character.name} is provoked by ${source.character.name}!`,
        statusEffect: {
          id: "taunted",
          name: "Taunted",
          stat: "SPD" as const,
          delta: -1,
          ttl: 3,
          description: "Must target taunter, -1 SPD for 3 turns",
          forcedTarget: source.id
        }
      }));
    }
  ),

  protect: createSupportMove(
    "protect",
    "Protect",
    "ally",
    "Reduces damage to an ally by 50% for 3 turns",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      // Find ally with lowest HP percentage who isn't the user
      const allies = ctx.combatants.filter(c => c.isEnemy === source.isEnemy && c.id !== source.id);
      if (allies.length === 0) return [];

      const targetAlly = allies.reduce((lowest, ally) => {
        const allyHpPct = ally.hp / ally.character.base.HP;
        const lowestHpPct = lowest.hp / lowest.character.base.HP;
        return allyHpPct < lowestHpPct ? ally : lowest;
      });

      return [{
        type: "buff" as const,
        source: source.id,
        target: [targetAlly.id],
        value: 0,
        message: `${source.character.name} protects ${targetAlly.character.name}!`,
        statusEffect: {
          id: "protected",
          name: "Protected",
          stat: "DEF" as const,
          delta: 0,
          ttl: 3,
          description: "Damage reduced by 50% for 3 turns",
          damageReduction: 0.5
        }
      }];
    }
  ),

  fortress_mode: createSupportMove(
    "fortress_mode",
    "Fortress Mode",
    "self",
    "Massive defense boost but cannot attack",
    (ctx: BattleContext) => {
      const source = ctx.combatants.find(c => c.id === ctx.actions[ctx.actions.length - 1]?.source);
      if (!source) return [];

      return [{
        type: "buff" as const,
        source: source.id,
        target: [source.id],
        value: 8,
        message: `${source.character.name} enters fortress mode!`,
        statusEffect: {
          id: "fortress",
          name: "Fortress Mode",
          stat: "DEF" as const,
          delta: 8,
          ttl: 4,
          description: "+8 DEF, cannot attack for 4 turns",
          preventAttack: true
        }
      }];
    }
  )
};

// Move progression tiers
export const MOVE_TIERS: MoveTier[] = [
  // Glider progression
  { id: "peck", name: "Peck", tier: 1, cost: 0, description: "Basic attack", effect: PLAYER_MOVES.peck },
  { id: "precision_strike", name: "Precision Strike", tier: 2, cost: 100, upgradeFrom: "peck", description: "Upgraded peck", effect: PLAYER_MOVES.precision_strike },
  { id: "alpha_strike", name: "Alpha Strike", tier: 3, cost: 250, upgradeFrom: "precision_strike", description: "Ultimate peck", effect: PLAYER_MOVES.alpha_strike },

  { id: "inspire", name: "Inspire", tier: 1, cost: 0, description: "Basic team buff", effect: PLAYER_MOVES.inspire },
  { id: "rally", name: "Rally", tier: 2, cost: 100, upgradeFrom: "inspire", description: "Stronger team buff", effect: PLAYER_MOVES.rally },
  { id: "battle_cry", name: "Battle Cry", tier: 3, cost: 250, upgradeFrom: "rally", description: "Ultimate team buff", effect: PLAYER_MOVES.battle_cry },

  { id: "gust", name: "Gust", tier: 1, cost: 0, description: "Basic AoE attack", effect: PLAYER_MOVES.gust },
  { id: "wind_wall", name: "Wind Wall", tier: 2, cost: 100, upgradeFrom: "gust", description: "Defensive wind ability", effect: PLAYER_MOVES.wind_wall },
  { id: "storm_call", name: "Storm Call", tier: 3, cost: 250, upgradeFrom: "wind_wall", description: "Ultimate storm attack", effect: PLAYER_MOVES.storm_call },

  // Orvus (tank) progression
  { id: "wing_slam", name: "Wing Slam", tier: 1, cost: 0, description: "Basic tank attack", effect: PLAYER_MOVES.wing_slam },
  { id: "blueprint_guard", name: "Blueprint Guard", tier: 1, cost: 0, description: "Party defense buff", effect: PLAYER_MOVES.blueprint_guard },
  { id: "taunt", name: "Taunt", tier: 2, cost: 150, description: "Force enemies to target you", effect: PLAYER_MOVES.taunt },
  { id: "protect", name: "Protect", tier: 2, cost: 150, description: "Shield an ally from harm", effect: PLAYER_MOVES.protect },
  { id: "fortress_mode", name: "Fortress Mode", tier: 3, cost: 300, description: "Ultimate defense but can't attack", effect: PLAYER_MOVES.fortress_mode },

  // Luma (healer) progression
  { id: "sparkle_spit", name: "Sparkle Spit", tier: 1, cost: 0, description: "Basic magic attack", effect: PLAYER_MOVES.sparkle_spit },
  { id: "healing_rain", name: "Healing Rain", tier: 1, cost: 0, description: "Party healing ability", effect: PLAYER_MOVES.healing_rain },
  { id: "petal_shield", name: "Petal Shield", tier: 1, cost: 0, description: "Shield an ally", effect: PLAYER_MOVES.petal_shield },
  { id: "life_burst", name: "Life Burst", tier: 2, cost: 150, upgradeFrom: "healing_rain", description: "Stronger party healing", effect: PLAYER_MOVES.life_burst },
  { id: "glow_burst", name: "Glow Burst", tier: 2, cost: 150, upgradeFrom: "sparkle_spit", description: "Enhanced magic attack", effect: PLAYER_MOVES.glow_burst },

  // Sable progression
  { id: "acorn_toss", name: "Acorn Toss", tier: 1, cost: 0, description: "Basic ranged attack", effect: PLAYER_MOVES.acorn_toss },
  { id: "shadow_bolt", name: "Shadow Bolt", tier: 2, cost: 100, upgradeFrom: "acorn_toss", description: "Dark projectile", effect: PLAYER_MOVES.shadow_bolt },
  { id: "void_strike", name: "Void Strike", tier: 3, cost: 250, upgradeFrom: "shadow_bolt", description: "Ultimate shadow attack", effect: PLAYER_MOVES.void_strike },

  // Add more progressions for other characters...
];

// Helper functions
export const getPlayerMove = (moveId: MoveId): MoveDef | null => {
  return PLAYER_MOVES[moveId] || null;
};

export const getMoveTier = (moveId: MoveId): MoveTier | null => {
  return MOVE_TIERS.find(tier => tier.id === moveId) || null;
};

export const getUpgradeOptions = (currentMoveId: MoveId): MoveTier[] => {
  return MOVE_TIERS.filter(tier => tier.upgradeFrom === currentMoveId);
};

export const canUpgradeMove = (currentMoveId: MoveId, virtuAcorns: number): MoveTier[] => {
  const upgrades = getUpgradeOptions(currentMoveId);
  return upgrades.filter(upgrade => upgrade.cost <= virtuAcorns);
};