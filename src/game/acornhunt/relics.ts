// Relic system for Acorn Hunt
import { RelicDef, RelicRarity, RunState } from './types';

// All 15 starter relics organized by rarity
export const RELICS: Record<string, RelicDef> = {
  // Common relics (filler)
  acorn_sneakers: {
    id: "acorn_sneakers",
    name: "Acorn Sneakers",
    rarity: "common",
    description: "+10% dodge if SPD > 7",
    emoji: "👟🌰",
    requires: { SPD: 8 },
    apply: (run: RunState) => {
      run.modifiers.dodgeBonus += 10;
    },
    iconKey: "acorn_sneakers"
  },

  acorn_shell_shield: {
    id: "acorn_shell_shield",
    name: "Acorn Shell Shield",
    rarity: "common",
    description: "DEF +2, 10% block chance",
    emoji: "🛡️🌰",
    apply: (run: RunState) => {
      run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) + 2;
      run.modifiers.dodgeBonus += 10; // Using dodge as block for now
    },
    iconKey: "acorn_shell_shield"
  },

  four_leaf_moss: {
    id: "four_leaf_moss",
    name: "Four-Leaf Moss",
    rarity: "common",
    description: "LCK +2 (Moss quips every fight)",
    emoji: "🍀🌿",
    apply: (run: RunState) => {
      run.modifiers.statBonuses.LCK = (run.modifiers.statBonuses.LCK || 0) + 2;
      // TODO: Add Moss battle quips
    },
    iconKey: "four_leaf_moss"
  },

  hummingbird_feather: {
    id: "hummingbird_feather",
    name: "Hummingbird Feather",
    rarity: "common",
    description: "SPD +2, -10% damage dealt",
    emoji: "🪶💨",
    apply: (run: RunState) => {
      run.modifiers.statBonuses.SPD = (run.modifiers.statBonuses.SPD || 0) + 2;
      run.modifiers.damageMult *= 0.9; // -10% damage
    },
    iconKey: "hummingbird_feather"
  },

  // Uncommon relics
  broken_nutcracker: {
    id: "broken_nutcracker",
    name: "Broken Nutcracker",
    rarity: "uncommon",
    description: "STR +2, 15% chance to drop 1 Acorn on hit",
    emoji: "🔨💔",
    apply: (run: RunState) => {
      run.modifiers.statBonuses.STR = (run.modifiers.statBonuses.STR || 0) + 2;
      run.modifiers.hooks.onAttack = (ctx) => {
        if (ctx.rng() < 0.15) {
          run.rewards.acorns += 1;
        }
      };
    },
    iconKey: "broken_nutcracker"
  },

  runed_acorn: {
    id: "runed_acorn",
    name: "Runed Acorn",
    rarity: "uncommon",
    description: "MAG +4, but all allies take +2 damage per hit",
    emoji: "🌰📜",
    apply: (run: RunState) => {
      run.modifiers.statBonuses.MAG = (run.modifiers.statBonuses.MAG || 0) + 4;
      // Damage increase is handled via negative DEF bonus
      run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) - 2;
    },
    iconKey: "runed_acorn"
  },

  rusty_branch_armor: {
    id: "rusty_branch_armor",
    name: "Rusty Branch Armor",
    rarity: "uncommon",
    description: "DEF +4, SPD -2",
    emoji: "🛡️🌿",
    apply: (run: RunState) => {
      run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) + 4;
      run.modifiers.statBonuses.SPD = (run.modifiers.statBonuses.SPD || 0) - 2;
    },
    iconKey: "rusty_branch_armor"
  },

  orvus_sketchbook: {
    id: "orvus_sketchbook",
    name: "Orvus's Sketchbook",
    rarity: "uncommon",
    description: "30% chance on attack: Random effect (+3 to random stat for 2 turns)",
    emoji: "📓🦉",
    apply: (run: RunState) => {
      run.modifiers.hooks.onAttack = (ctx) => {
        if (ctx.rng() < 0.3) {
          const stats: (keyof typeof run.modifiers.statBonuses)[] = ['STR', 'SPD', 'MAG', 'DEF', 'LCK'];
          const randomStat = stats[Math.floor(ctx.rng() * stats.length)];
          const source = ctx.combatants.find(c => !c.isEnemy);
          if (source) {
            source.statusEffects.push({
              id: `orvus_${randomStat.toLowerCase()}`,
              name: `Sketched ${randomStat}`,
              stat: randomStat,
              delta: 3,
              ttl: 2,
              description: `+3 ${randomStat} from Orvus's sketch`
            });
          }
        }
      };
    },
    iconKey: "orvus_sketchbook"
  },

  // Rare relics
  pillow_fort_plans: {
    id: "pillow_fort_plans",
    name: "Pillow Fort Plans",
    rarity: "rare",
    description: "All allies gain +2 DEF and 15% damage reduction",
    emoji: "🏰🛏️",
    requires: { DEF: 7 },
    apply: (run: RunState) => {
      run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) + 2;
      // Damage reduction implemented as effective DEF increase
      run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) + 1;
    },
    iconKey: "pillow_fort_plans"
  },

  luma_sparkle_ribbon: {
    id: "luma_sparkle_ribbon",
    name: "Luma's Sparkle Ribbon",
    rarity: "rare",
    description: "Heal 2 HP to all allies each round if MAG > 8",
    emoji: "🎀✨",
    requires: { MAG: 9 },
    apply: (run: RunState) => {
      run.modifiers.healPerTurn += 2;
    },
    iconKey: "luma_sparkle_ribbon"
  },

  moss_hammock_rope: {
    id: "moss_hammock_rope",
    name: "Moss's Hammock Rope",
    rarity: "rare",
    description: "Every 3rd attack deals double damage (stacks across battles)",
    emoji: "🪢🦥",
    apply: (run: RunState) => {
      let attackCount = 0;
      run.modifiers.hooks.onAttack = (ctx) => {
        attackCount++;
        if (attackCount % 3 === 0) {
          // Double damage on every 3rd attack - implemented by temporarily doubling damage multiplier
          const originalMult = run.modifiers.damageMult;
          run.modifiers.damageMult *= 2;
          // Reset after this attack (this is a simplified implementation)
          setTimeout(() => {
            run.modifiers.damageMult = originalMult;
          }, 100);
        }
      };
    },
    iconKey: "moss_hammock_rope"
  },

  sable_hatpin: {
    id: "sable_hatpin",
    name: "Sable's Hatpin",
    rarity: "rare",
    description: "+15% crit chance and crits heal party for 3 HP",
    emoji: "📍🖤",
    apply: (run: RunState) => {
      run.modifiers.critChanceBonus += 15;
      run.modifiers.hooks.onCrit = (ctx) => {
        // Heal all allies on crit
        ctx.combatants.filter(c => !c.isEnemy).forEach(ally => {
          ally.stats.HP = Math.min(ally.stats.HPMax, ally.stats.HP + 3);
        });
      };
    },
    iconKey: "sable_hatpin"
  },

  // Legendary relics
  carmine_feather_boa: {
    id: "carmine_feather_boa",
    name: "Carmine's Feather Boa",
    rarity: "legendary",
    description: "Crits grant +1 Acorn and +5% SPD (1 turn) to party",
    emoji: "🪶👑",
    apply: (run: RunState) => {
      run.modifiers.hooks.onCrit = (ctx) => {
        run.rewards.acorns += 1;
        // TODO: Add temporary SPD boost to party
      };
    },
    iconKey: "carmine_feather_boa"
  },

  juno_lucky_token: {
    id: "juno_lucky_token",
    name: "Juno's Lucky Token",
    rarity: "legendary",
    description: "Each round: 25% chance to grant +2 to all stats for 1 turn",
    emoji: "🪙🍀",
    apply: (run: RunState) => {
      run.modifiers.hooks.onRoundStart = (ctx) => {
        if (ctx.rng() < 0.25) {
          // Apply temporary stat boosts to all allies
          ctx.combatants.filter(c => !c.isEnemy).forEach(ally => {
            ['STR', 'SPD', 'MAG', 'DEF', 'LCK'].forEach(stat => {
              ally.statusEffects.push({
                id: `juno_luck_${stat.toLowerCase()}`,
                name: `Lucky ${stat}`,
                stat: stat as any,
                delta: 2,
                ttl: 1,
                description: `+2 ${stat} from Juno's luck`
              });
            });
          });
        }
      };
    },
    iconKey: "juno_lucky_token"
  },

  perfect_sketchbook: {
    id: "perfect_sketchbook",
    name: "Perfect Sketchbook",
    rarity: "legendary",
    description: "50% chance on attack: +4 to random stat for 3 turns (always positive)",
    emoji: "📖⭐",
    apply: (run: RunState) => {
      run.modifiers.hooks.onAttack = (ctx) => {
        if (ctx.rng() < 0.5) {
          const stats: (keyof typeof run.modifiers.statBonuses)[] = ['STR', 'SPD', 'MAG', 'DEF', 'LCK'];
          const randomStat = stats[Math.floor(ctx.rng() * stats.length)];
          const source = ctx.combatants.find(c => !c.isEnemy);
          if (source) {
            source.statusEffects.push({
              id: `perfect_${randomStat.toLowerCase()}`,
              name: `Perfect ${randomStat}`,
              stat: randomStat,
              delta: 4,
              ttl: 3,
              description: `+4 ${randomStat} from perfect sketch`
            });
          }
        }
      };
    },
    iconKey: "perfect_sketchbook"
  },

  // === NEW POWERFUL RELICS FOR STRATEGIC DEPTH ===

  // More Common Relics
  squirrel_energy_drink: {
    id: "squirrel_energy_drink",
    name: "Squirrel Energy Drink",
    rarity: "common",
    description: "SPD +3, but lose 1 HP each round",
    emoji: "🥤⚡",
    apply: (run: RunState) => {
      run.modifiers.statBonuses.SPD = (run.modifiers.statBonuses.SPD || 0) + 3;
      run.modifiers.hooks.onRoundStart = (ctx) => {
        ctx.combatants.filter(c => !c.isEnemy).forEach(ally => {
          ally.stats.HP = Math.max(1, ally.stats.HP - 1);
        });
      };
    },
    iconKey: "squirrel_energy_drink"
  },

  crystal_acorn: {
    id: "crystal_acorn",
    name: "Crystal Acorn",
    rarity: "common",
    description: "Double acorn drops but take +1 damage per hit",
    emoji: "🌰💎",
    apply: (run: RunState) => {
      run.modifiers.acornDropMult *= 2;
      run.modifiers.statBonuses.DEF = (run.modifiers.statBonuses.DEF || 0) - 1;
    },
    iconKey: "crystal_acorn"
  },

  // More Uncommon Relics
  berserker_totem: {
    id: "berserker_totem",
    name: "Berserker Totem",
    rarity: "uncommon",
    description: "Gain +1 STR for every 10 HP missing (all allies)",
    emoji: "🗿🔥",
    apply: (run: RunState) => {
      run.modifiers.hooks.onRoundStart = (ctx) => {
        ctx.combatants.filter(c => !c.isEnemy).forEach(ally => {
          // Remove old berserker buffs
          ally.statusEffects = ally.statusEffects.filter(e => e.id !== 'berserker_rage');

          const missingHP = ally.stats.HPMax - ally.stats.HP;
          const strBonus = Math.floor(missingHP / 10);

          if (strBonus > 0) {
            ally.statusEffects.push({
              id: 'berserker_rage',
              name: 'Berserker Rage',
              stat: 'STR',
              delta: strBonus,
              ttl: 99,
              description: `+${strBonus} STR from missing HP`
            });
          }
        });
      };
    },
    iconKey: "berserker_totem"
  },

  // More Rare Relics
  vampiric_acorn_shell: {
    id: "vampiric_acorn_shell",
    name: "Vampiric Acorn Shell",
    rarity: "rare",
    description: "Heal 2 HP on each attack, but -2 to all stats",
    emoji: "🌰🩸",
    apply: (run: RunState) => {
      ['STR', 'SPD', 'MAG', 'DEF', 'LCK'].forEach(stat => {
        run.modifiers.statBonuses[stat] = (run.modifiers.statBonuses[stat] || 0) - 2;
      });

      run.modifiers.hooks.onAttack = (ctx) => {
        const attacker = ctx.combatants.find(c => !c.isEnemy);
        if (attacker) {
          attacker.stats.HP = Math.min(attacker.stats.HPMax, attacker.stats.HP + 2);
        }
      };
    },
    iconKey: "vampiric_acorn_shell"
  },

  // More Legendary Relics
  chaos_theory_manual: {
    id: "chaos_theory_manual",
    name: "Chaos Theory Manual",
    rarity: "legendary",
    description: "Each round: 50% chance for +8 random stat OR -3 all stats (1 turn)",
    emoji: "📚🌪️",
    apply: (run: RunState) => {
      run.modifiers.hooks.onRoundStart = (ctx) => {
        const allies = ctx.combatants.filter(c => !c.isEnemy);

        if (ctx.rng() < 0.5) {
          // Positive: +8 to random stat
          const stats = ['STR', 'SPD', 'MAG', 'DEF', 'LCK'];
          const randomStat = stats[Math.floor(ctx.rng() * stats.length)];

          allies.forEach(ally => {
            ally.statusEffects.push({
              id: `chaos_boost_${randomStat.toLowerCase()}`,
              name: `Chaos ${randomStat}`,
              stat: randomStat as any,
              delta: 8,
              ttl: 1,
              description: `+8 ${randomStat} from chaos`
            });
          });
        } else {
          // Negative: -3 to all stats
          allies.forEach(ally => {
            ['STR', 'SPD', 'MAG', 'DEF', 'LCK'].forEach(stat => {
              ally.statusEffects.push({
                id: `chaos_debuff_${stat.toLowerCase()}`,
                name: `Chaos Drain`,
                stat: stat as any,
                delta: -3,
                ttl: 1,
                description: `-3 ${stat} from chaos`
              });
            });
          });
        }
      };
    },
    iconKey: "chaos_theory_manual"
  }
};

// Helper functions for relic management
export const getRelicsByRarity = (rarity: RelicRarity): RelicDef[] => {
  return Object.values(RELICS).filter(relic => relic.rarity === rarity);
};

export const getRandomRelicsOfRarity = (rarity: RelicRarity, count: number, rng: () => number): RelicDef[] => {
  const relicsOfRarity = getRelicsByRarity(rarity);
  const selected: RelicDef[] = [];
  const available = [...relicsOfRarity];

  for (let i = 0; i < count && available.length > 0; i++) {
    const index = Math.floor(rng() * available.length);
    selected.push(available.splice(index, 1)[0]);
  }

  return selected;
};

export const generateRelicChoices = (rng: () => number): RelicDef[] => {
  // Generate 3 relic choices with weighted rarity
  const roll = rng();

  if (roll < 0.5) {
    // 50% chance: 2 common, 1 uncommon
    return [
      ...getRandomRelicsOfRarity("common", 2, rng),
      ...getRandomRelicsOfRarity("uncommon", 1, rng)
    ];
  } else if (roll < 0.8) {
    // 30% chance: 1 common, 2 uncommon
    return [
      ...getRandomRelicsOfRarity("common", 1, rng),
      ...getRandomRelicsOfRarity("uncommon", 2, rng)
    ];
  } else if (roll < 0.95) {
    // 15% chance: 1 uncommon, 1 rare, 1 common
    return [
      ...getRandomRelicsOfRarity("common", 1, rng),
      ...getRandomRelicsOfRarity("uncommon", 1, rng),
      ...getRandomRelicsOfRarity("rare", 1, rng)
    ];
  } else {
    // 5% chance: 1 legendary + 2 others
    return [
      ...getRandomRelicsOfRarity("uncommon", 1, rng),
      ...getRandomRelicsOfRarity("rare", 1, rng),
      ...getRandomRelicsOfRarity("legendary", 1, rng)
    ];
  }
};

// Apply all relics in a run to the run state
export const applyAllRelics = (run: RunState) => {
  run.relics.forEach(relicId => {
    const relic = RELICS[relicId];
    if (relic) {
      relic.apply(run);
    }
  });
};

// Check if a character meets a relic's requirements
export const checkRelicRequirements = (relic: RelicDef, characterStats: Partial<Stats>): { met: boolean; details: Array<{ stat: string; required: number; current: number; met: boolean }> } => {
  if (!relic.requires) {
    return { met: true, details: [] };
  }

  const details = Object.entries(relic.requires).map(([stat, requiredValue]) => {
    const currentValue = characterStats[stat as keyof Stats] || 0;
    return {
      stat,
      required: requiredValue,
      current: currentValue,
      met: currentValue >= requiredValue
    };
  });

  const met = details.every(detail => detail.met);
  return { met, details };
};

// Check if ANY character in the party meets the relic's requirements
export const checkPartyRelicRequirements = (relic: RelicDef, partyStats: Stats[]): { anyCharacterMeetsRequirements: boolean; characterResults: Array<{ characterIndex: number; met: boolean; details: any[] }> } => {
  if (!relic.requires) {
    return {
      anyCharacterMeetsRequirements: true,
      characterResults: partyStats.map((_, index) => ({ characterIndex: index, met: true, details: [] }))
    };
  }

  const characterResults = partyStats.map((stats, index) => {
    const result = checkRelicRequirements(relic, stats);
    return {
      characterIndex: index,
      met: result.met,
      details: result.details
    };
  });

  const anyCharacterMeetsRequirements = characterResults.some(result => result.met);

  return {
    anyCharacterMeetsRequirements,
    characterResults
  };
};