// Skill tree definitions for Acorn Hunt character progression
import { SkillTree, SkillNode, CharacterId } from './types';

// Helper function to create skill nodes
const createSkillNode = (
  id: string,
  name: string,
  description: string,
  cost: number,
  prerequisites: string[] = [],
  effect: SkillNode['effect']
): SkillNode => ({
  id,
  name,
  description,
  cost,
  prerequisites,
  effect
});

// Glider (Player) Skill Trees
export const GLIDER_SKILLS: SkillTree = {
  characterId: "player",
  branches: {
    leadership: {
      name: "Leadership",
      description: "Enhance team coordination and support abilities",
      nodes: [
        createSkillNode(
          "glider_team_inspire",
          "Team Inspire",
          "+5% to all party member stats",
          250,
          [],
          (character, run) => {
            // Apply +5% stat bonus to all party members
            Object.keys(run.modifiers.statBonuses).forEach(stat => {
              if (run.modifiers.statBonuses[stat as keyof typeof run.modifiers.statBonuses]) {
                run.modifiers.statBonuses[stat as keyof typeof run.modifiers.statBonuses]! *= 1.05;
              }
            });
          }
        ),
        createSkillNode(
          "glider_second_wind",
          "Second Wind",
          "Heal party 15% HP after battle victory",
          500,
          ["glider_team_inspire"],
          (character, run) => {
            // Add post-battle heal hook
            run.modifiers.hooks.onPostBattle = (ctx) => {
              ctx.combatants.filter(c => !c.isEnemy).forEach(ally => {
                const healAmount = Math.floor(ally.character.base.HPMax * 0.15);
                ally.stats.HP = Math.min(ally.stats.HPMax, ally.stats.HP + healAmount);
              });
            };
          }
        ),
        createSkillNode(
          "glider_pack_leader",
          "Pack Leader",
          "Party gets +1 to all damage rolls",
          750,
          ["glider_second_wind"],
          (character, run) => {
            run.modifiers.damageMult += 0.2;
          }
        )
      ]
    },
    combat: {
      name: "Combat Mastery",
      description: "Improve direct combat effectiveness",
      nodes: [
        createSkillNode(
          "glider_critical_thinking",
          "Critical Thinking",
          "+10% critical hit chance",
          200,
          [],
          (character, run) => {
            run.modifiers.critChanceBonus += 10;
          }
        ),
        createSkillNode(
          "glider_adaptive_tactics",
          "Adaptive Tactics",
          "Can use any ally's basic move once per battle",
          400,
          ["glider_critical_thinking"],
          (character, run) => {
            // This would require battle system integration
            // For now, just provide a damage bonus
            run.modifiers.damageMult += 0.15;
          }
        ),
        createSkillNode(
          "glider_finishing_move",
          "Finishing Move",
          "+100% damage vs enemies below 25% HP",
          600,
          ["glider_adaptive_tactics"],
          (character, run) => {
            // Would require battle system integration for conditional damage
            run.modifiers.damageMult += 0.25;
          }
        )
      ]
    },
    utility: {
      name: "Field Operations",
      description: "Enhance exploration and resource gathering",
      nodes: [
        createSkillNode(
          "glider_scout_ahead",
          "Scout Ahead",
          "Reveal next 2 map nodes and their rewards",
          300,
          [],
          (character, run) => {
            // This would require map system integration
            // For now, just provide luck bonus
            run.modifiers.statBonuses.LCK = (run.modifiers.statBonuses.LCK || 0) + 1;
          }
        ),
        createSkillNode(
          "glider_resource_gathering",
          "Resource Gathering",
          "+25% VirtuAcorns from all sources",
          600,
          ["glider_scout_ahead"],
          (character, run) => {
            run.modifiers.acornDropMult *= 1.25;
          }
        ),
        createSkillNode(
          "glider_lucky_find",
          "Lucky Find",
          "10% chance for bonus rewards after battles",
          900,
          ["glider_resource_gathering"],
          (character, run) => {
            run.modifiers.acornDropMult *= 1.1;
            run.modifiers.statBonuses.LCK = (run.modifiers.statBonuses.LCK || 0) + 2;
          }
        )
      ]
    }
  }
};

// Luma (Tree Frog) Skill Trees
export const LUMA_SKILLS: SkillTree = {
  characterId: "luma",
  branches: {
    healing: {
      name: "Healing Arts",
      description: "Master the art of restoration magic",
      nodes: [
        createSkillNode(
          "luma_greater_heal",
          "Greater Heal",
          "Single target heal for 40% max HP",
          200,
          [],
          (character, run) => {
            run.modifiers.healPerTurn += 5;
          }
        ),
        createSkillNode(
          "luma_mass_heal",
          "Mass Heal",
          "All allies heal 20% max HP",
          400,
          ["luma_greater_heal"],
          (character, run) => {
            run.modifiers.postBattleHealPct += 20;
          }
        ),
        createSkillNode(
          "luma_resurrection",
          "Resurrection",
          "Revive fallen ally at 25% HP (once per battle)",
          800,
          ["luma_mass_heal"],
          (character, run) => {
            // This would require battle system integration
            run.modifiers.postBattleHealPct += 30;
          }
        )
      ]
    },
    nature: {
      name: "Nature Magic",
      description: "Harness the power of natural forces",
      nodes: [
        createSkillNode(
          "luma_poison_immunity",
          "Poison Immunity",
          "Party becomes immune to poison effects",
          250,
          [],
          (character, run) => {
            // Would require status effect system integration
            run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) + 1;
          }
        ),
        createSkillNode(
          "luma_regeneration",
          "Regeneration",
          "Party heals 5% max HP at start of each turn",
          500,
          ["luma_poison_immunity"],
          (character, run) => {
            run.modifiers.healPerTurn += 10;
          }
        ),
        createSkillNode(
          "luma_bloom",
          "Bloom",
          "Heal + temporary +2 to all stats for 3 turns",
          750,
          ["luma_regeneration"],
          (character, run) => {
            run.modifiers.healPerTurn += 5;
            Object.keys(run.modifiers.statBonuses).forEach(stat => {
              run.modifiers.statBonuses[stat as keyof typeof run.modifiers.statBonuses] =
                (run.modifiers.statBonuses[stat as keyof typeof run.modifiers.statBonuses] || 0) + 1;
            });
          }
        )
      ]
    },
    protective: {
      name: "Protective Magic",
      description: "Shield allies from harm",
      nodes: [
        createSkillNode(
          "luma_shield_wall",
          "Shield Wall",
          "Party gains +3 DEF for 3 turns",
          300,
          [],
          (character, run) => {
            run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) + 2;
          }
        ),
        createSkillNode(
          "luma_magic_barrier",
          "Magic Barrier",
          "Party immune to debuffs for 2 turns",
          600,
          ["luma_shield_wall"],
          (character, run) => {
            run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) + 1;
            run.modifiers.statBonuses.MAG = (run.modifiers.statBonuses.MAG || 0) + 1;
          }
        ),
        createSkillNode(
          "luma_sanctuary",
          "Sanctuary Zone",
          "Party cannot be targeted by attacks for 1 turn",
          1000,
          ["luma_magic_barrier"],
          (character, run) => {
            // This would require battle system integration
            run.modifiers.dodgeBonus += 25;
          }
        )
      ]
    }
  }
};

// Sable (Goth Squirrel) Skill Trees
export const SABLE_SKILLS: SkillTree = {
  characterId: "sable",
  branches: {
    critical: {
      name: "Critical Mastery",
      description: "Perfect the art of devastating strikes",
      nodes: [
        createSkillNode(
          "sable_improved_crit",
          "Improved Crit",
          "+15% critical hit chance",
          200,
          [],
          (character, run) => {
            run.modifiers.critChanceBonus += 15;
          }
        ),
        createSkillNode(
          "sable_crit_mastery",
          "Crit Mastery",
          "Critical hits deal +100% damage instead of +50%",
          400,
          ["sable_improved_crit"],
          (character, run) => {
            // This would require battle system integration
            run.modifiers.damageMult += 0.3;
          }
        ),
        createSkillNode(
          "sable_crit_chain",
          "Crit Chain",
          "Critical hits grant an extra turn",
          600,
          ["sable_crit_mastery"],
          (character, run) => {
            // This would require battle system integration
            run.modifiers.critChanceBonus += 10;
            run.modifiers.damageMult += 0.2;
          }
        )
      ]
    },
    shadow: {
      name: "Shadow Arts",
      description: "Master stealth and assassination techniques",
      nodes: [
        createSkillNode(
          "sable_stealth",
          "Stealth",
          "Gain 50% dodge chance for 2 turns",
          250,
          [],
          (character, run) => {
            run.modifiers.dodgeBonus += 20;
          }
        ),
        createSkillNode(
          "sable_shadow_step",
          "Shadow Step",
          "Teleport to attack any enemy, ignoring positioning",
          500,
          ["sable_stealth"],
          (character, run) => {
            run.modifiers.statBonuses.SPD = (run.modifiers.statBonuses.SPD || 0) + 3;
          }
        ),
        createSkillNode(
          "sable_assassinate",
          "Assassinate",
          "Guaranteed critical hit vs enemies at full HP",
          750,
          ["sable_shadow_step"],
          (character, run) => {
            run.modifiers.critChanceBonus += 25;
            run.modifiers.damageMult += 0.4;
          }
        )
      ]
    },
    dark_arts: {
      name: "Dark Arts",
      description: "Embrace forbidden shadow magic",
      nodes: [
        createSkillNode(
          "sable_curse_enemy",
          "Curse Enemy",
          "Reduce target's all stats by 2 for entire battle",
          300,
          [],
          (character, run) => {
            run.modifiers.statBonuses.MAG = (run.modifiers.statBonuses.MAG || 0) + 2;
          }
        ),
        createSkillNode(
          "sable_life_drain",
          "Life Drain",
          "Damage dealt heals self for 50% of damage done",
          600,
          ["sable_curse_enemy"],
          (character, run) => {
            run.modifiers.healPerTurn += 8;
          }
        ),
        createSkillNode(
          "sable_shadow_mastery",
          "Shadow Mastery",
          "Immune to all debuffs and status effects",
          1000,
          ["sable_life_drain"],
          (character, run) => {
            run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) + 3;
            run.modifiers.statBonuses.MAG = (run.modifiers.statBonuses.MAG || 0) + 2;
          }
        )
      ]
    }
  }
};

// Orvus (Tank) Skill Tree
export const ORVUS_SKILLS: SkillTree = {
  characterId: "orvus",
  branches: {
    defense: {
      name: "Fortress Engineering",
      description: "Master the art of protection and defense",
      nodes: [
        createSkillNode(
          "orvus_improved_guard",
          "Enhanced Blueprints",
          "Blueprint Guard gives +1 DEF and lasts 1 extra turn",
          150,
          [],
          (character, run) => {
            // This would be applied when blueprint_guard is used
            // The move effect itself would check for this skill
          }
        ),
        createSkillNode(
          "orvus_tank_mastery",
          "Tank Mastery",
          "Start battles with +2 DEF",
          250,
          ["orvus_improved_guard"],
          (character, run) => {
            if (!run.modifiers.statBonuses) run.modifiers.statBonuses = {};
            if (!run.modifiers.statBonuses[character.id]) run.modifiers.statBonuses[character.id] = {};
            run.modifiers.statBonuses[character.id]["DEF"] = (run.modifiers.statBonuses[character.id]["DEF"] || 0) + 2;
          }
        ),
        createSkillNode(
          "orvus_fortress_master",
          "Fortress Master",
          "Fortress Mode gives +2 additional DEF and lasts 1 extra turn",
          400,
          ["orvus_tank_mastery"],
          (character, run) => {
            // This would be applied when fortress_mode is used
          }
        )
      ]
    },
    protection: {
      name: "Guardian Tactics",
      description: "Learn to protect allies and control the battlefield",
      nodes: [
        createSkillNode(
          "orvus_improved_taunt",
          "Intimidating Presence",
          "Taunt also reduces enemy accuracy by 15%",
          200,
          [],
          (character, run) => {
            // Applied when taunt is used
          }
        ),
        createSkillNode(
          "orvus_protect_mastery",
          "Protection Expert",
          "Protect reduces 60% damage instead of 50%",
          300,
          ["orvus_improved_taunt"],
          (character, run) => {
            // Applied when protect is used
          }
        ),
        createSkillNode(
          "orvus_guardian_aura",
          "Guardian Aura",
          "All allies take 10% less damage",
          500,
          ["orvus_protect_mastery"],
          (character, run) => {
            // Global damage reduction for party
            run.modifiers.statBonuses = run.modifiers.statBonuses || {};
            // This would need special handling in damage calculation
          }
        )
      ]
    }
  }
};

// Export all skill trees
export const SKILL_TREES: Record<CharacterId, SkillTree> = {
  player: GLIDER_SKILLS,
  luma: LUMA_SKILLS,
  sable: SABLE_SKILLS,
  orvus: ORVUS_SKILLS,
  juno: { characterId: "juno", branches: {} },
  moss: { characterId: "moss", branches: {} },
  carmine: { characterId: "carmine", branches: {} },
  zippa: { characterId: "zippa", branches: {} }
};

// Helper functions
export const getSkillTree = (characterId: CharacterId): SkillTree => {
  return SKILL_TREES[characterId];
};

export const getSkillNode = (characterId: CharacterId, skillId: string): SkillNode | null => {
  const tree = getSkillTree(characterId);
  for (const branch of Object.values(tree.branches)) {
    const node = branch.nodes.find(n => n.id === skillId);
    if (node) return node;
  }
  return null;
};

export const canUnlockSkill = (
  characterId: CharacterId,
  skillId: string,
  unlockedSkills: string[]
): boolean => {
  const node = getSkillNode(characterId, skillId);
  if (!node) return false;

  // Check if all prerequisites are unlocked
  return node.prerequisites?.every(prereq => unlockedSkills.includes(prereq)) ?? true;
};