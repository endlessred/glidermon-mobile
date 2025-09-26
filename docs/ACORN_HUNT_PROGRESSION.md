# Acorn Hunt - Character Progression System

## Overview

The Acorn Hunt mini-game features a comprehensive character progression system that allows players to permanently upgrade their party members using VirtuAcorns, a currency earned exclusively within the mini-game. This system is designed to integrate with the main game's relationship mechanics while providing deep, engaging progression for the standalone experience.

## Currency System

### VirtuAcorns
- **Purpose**: Mini-game exclusive currency for permanent character upgrades
- **Separate from main game acorns**: Prevents economy conflicts with idle game progression
- **Earned through**: Battle victories, events, treasures, boss defeats
- **Used for**: Move upgrades, skill tree progression, character enhancements

### VirtuAcorn Sources & Rates
- **Battle Victory**: 20-40 VirtuAcorns (scales with enemy difficulty)
- **Perfect Battle** (no damage taken): +50% bonus VirtuAcorns
- **Event Rewards**: 10-30 VirtuAcorns (varies by choice)
- **Treasure Chests**: 25-75 VirtuAcorns
- **Boss Victory**: 100-200 VirtuAcorns
- **Relationship Bonus**: +25% VirtuAcorns per character at maximum relationship level

## Character Role System

### 1. Glider (Player Character) - Support Leader
**Role**: Team coordinator, tactical support, balanced utility
**Base Stats**: Balanced across all attributes
**Core Identity**: Adaptive leader who enhances team performance

**Move Progression**:
- **Peck** → **Precision Strike** → **Alpha Strike**
  - Basic attack scaling from 1x STR to 1.5x STR to 2.5x STR
- **Inspire** → **Rally** → **Battle Cry**
  - Team buff scaling from +1 stats to +2 stats to +3 stats + speed boost
- **Gust** → **Wind Wall** → **Storm Call**
  - Utility scaling from single knockback to party defense to AoE control

**Skill Trees**:
```
Leadership Branch (250/500/750 VA):
├─ Team Inspire: +5% to all party member stats
├─ Second Wind: Heal party 15% HP after battle victory
└─ Pack Leader: Party gets +1 to all damage rolls

Combat Branch (200/400/600 VA):
├─ Critical Thinking: +10% critical hit chance
├─ Adaptive Tactics: Can use any ally's basic move once per battle
└─ Finishing Move: +100% damage vs enemies below 25% HP

Utility Branch (300/600/900 VA):
├─ Scout Ahead: Reveal next 2 map nodes and their rewards
├─ Resource Gathering: +25% VirtuAcorns from all sources
└─ Lucky Find: 10% chance for bonus rewards after battles
```

### 2. Luma (Tree Frog) - Primary Healer
**Role**: Main healer, magical support, party sustain
**Base Stats**: High MAG, moderate DEF, low STR
**Core Identity**: Life magic specialist keeping the team alive

**Move Progression**:
- **Sparkle Spit** → **Healing Rain** → **Life Burst**
  - Heal scaling from 25% HP single to 20% HP all to 40% HP all + status cure
- **Petal Shield** → **Nature's Armor** → **Sanctuary**
  - Defense scaling from +2 DEF to +3 DEF all to damage immunity 1 turn
- **Glow Burst** → **Cleansing Light** → **Divine Radiance**
  - Damage + utility scaling from basic damage to debuff removal to AoE damage + heal

**Skill Trees**:
```
Healing Branch (200/400/800 VA):
├─ Greater Heal: Single target heal for 40% max HP
├─ Mass Heal: All allies heal 20% max HP
└─ Resurrection: Revive fallen ally at 25% HP (once per battle)

Nature Magic Branch (250/500/750 VA):
├─ Poison Immunity: Party becomes immune to poison effects
├─ Regeneration: Party heals 5% max HP at start of each turn
└─ Bloom: Heal + temporary +2 to all stats for 3 turns

Protective Branch (300/600/1000 VA):
├─ Shield Wall: Party gains +3 DEF for 3 turns
├─ Magic Barrier: Party immune to debuffs for 2 turns
└─ Sanctuary Zone: Party cannot be targeted by attacks for 1 turn
```

### 3. Orvus (Owl) - Tank/Engineer
**Role**: Primary tank, tactical defense, enemy analysis
**Base Stats**: Very high DEF, high HP, low SPD
**Core Identity**: Defensive tactician with engineering utility

**Move Progression**:
- **Wing Slam** → **Shield Bash** → **Fortress Strike**
  - Defensive attack scaling with threat generation and counter-damage
- **Blueprint Guard** → **Tactical Defense** → **Impenetrable Wall**
  - Party defense scaling from basic DEF boost to damage reduction to damage reflection
- **Miscalculation** → **Sabotage** → **System Failure**
  - Enemy debuff scaling from single stat reduction to multiple debuffs to ability lockout

**Skill Trees**:
```
Defense Branch (150/350/700 VA):
├─ Taunt: Force all enemies to target Orvus for 2 turns
├─ Damage Reduction: Take 25% less damage from all sources
└─ Retaliatory Strike: Counter-attack deals 150% damage when hit

Engineering Branch (200/450/800 VA):
├─ Repair Kit: Self-heal for 30% max HP, can be used twice per battle
├─ Weapon Upgrade: Grant ally +2 STR and +10% crit for battle
└─ Emergency Protocol: Grant party damage immunity for 1 turn

Tactical Branch (300/600/900 VA):
├─ Analyze Enemy: Reveal enemy stats, next move, and weaknesses
├─ Weak Point: Mark enemy to take +50% damage from all sources
└─ Battle Plan: Party gains first strike and +1 action next turn
```

### 4. Sable (Goth Squirrel) - DPS/Critical Striker
**Role**: Primary damage dealer, critical hit specialist, stealth fighter
**Base Stats**: High SPD, high LCK, moderate STR
**Core Identity**: Critical-focused assassin with shadow abilities

**Move Progression**:
- **Acorn Toss** → **Shadow Bolt** → **Void Strike**
  - Ranged attack with increasing crit chance and dark damage
- **Hatpin Stab** → **Assassinate** → **Shadow Clone**
  - Melee critical attack scaling to guaranteed crit to multi-hit
- **Shadow Juggle** → **Darkness Veil** → **Shadow Storm**
  - Utility scaling from basic AoE to stealth to massive AoE damage

**Skill Trees**:
```
Critical Branch (200/400/600 VA):
├─ Improved Crit: +15% critical hit chance
├─ Crit Mastery: Critical hits deal +100% damage instead of +50%
└─ Crit Chain: Critical hits grant an extra turn

Shadow Branch (250/500/750 VA):
├─ Stealth: Gain 50% dodge chance for 2 turns
├─ Shadow Step: Teleport to attack any enemy, ignoring positioning
└─ Assassinate: Guaranteed critical hit vs enemies at full HP

Dark Arts Branch (300/600/1000 VA):
├─ Curse Enemy: Reduce target's all stats by 2 for entire battle
├─ Life Drain: Damage dealt heals self for 50% of damage done
└─ Shadow Mastery: Immune to all debuffs and status effects
```

### 5. Juno (Parrot) - Utility/Economy Support
**Role**: Speed support, resource generation, team coordination
**Base Stats**: Very high SPD, moderate LCK, low DEF
**Core Identity**: Fast support character focused on economy and utility

**Move Progression**:
- **Token Toss** → **Coin Barrage** → **Golden Rain**
  - Economy-themed attacks that also generate bonus VirtuAcorns
- **Echo Strike** → **Sonic Boom** → **Thunderous Roar**
  - Sound-based AoE attacks with increasing range and utility effects
- **Squawk of Glory** → **Battle Anthem** → **Victory Song**
  - Team buff scaling from basic bonuses to major stat boosts to victory conditions

**Skill Trees**:
```
Economy Branch (100/300/600 VA):
├─ Treasure Hunter: +50% VirtuAcorns from all battle rewards
├─ Lucky Strike: 10% chance to double all rewards from any source
└─ Merchant's Eye: All character upgrades cost 25% less VirtuAcorns

Speed Branch (200/400/700 VA):
├─ Swift Strike: Always act first in turn order
├─ Double Attack: Can attack twice per turn
└─ Blitz: Entire party gains an extra turn once per battle

Support Branch (250/500/800 VA):
├─ Inspiration: All ally abilities deal +1 damage
├─ Distraction: Enemy attacks have 25% higher miss chance
└─ Team Coordination: All party abilities cost 1 less resource to use
```

### 6. Moss (Sloth) - Berserker/Chaos Tank
**Role**: Heavy damage dealer, unpredictable effects, alternative tank
**Base Stats**: Very high STR, very low SPD, high HP
**Core Identity**: Slow but devastating with random powerful effects

**Move Progression**:
- **Lazy Swipe** → **Crushing Blow** → **Devastation**
  - Massive single-target damage scaling with charge-up mechanics
- **Nap Time** → **Deep Sleep** → **Hibernation**
  - Self-buff through sleeping mechanics, gaining power while inactive
- **Sloth Smash** → **Earthquake** → **World Shaker**
  - AoE destruction scaling from small area to battlefield-wide effects

**Skill Trees**:
```
Berserker Branch (150/400/800 VA):
├─ Rage Mode: +4 STR, -2 DEF for entire battle when activated
├─ Unstoppable: Immune to stuns, fears, and movement debuffs
└─ Rampage: Damage increases by 25% each turn, resets if no damage dealt

Sleep Branch (200/500/900 VA):
├─ Power Nap: Skip turn to gain +3 to all stats for 3 turns
├─ Dream Strike: Can attack while sleeping, dreams deal magic damage
└─ Nightmare: While sleeping, all enemies take 10% max HP damage per turn

Chaos Branch (300/600/1200 VA):
├─ Random Strike: Damage varies from 50% to 300% of normal
├─ Unpredictable: 50% chance to ignore enemy abilities each turn
└─ Chaos Theory: Random beneficial effect each turn (heal, buff, damage, etc.)
```

### 7. Carmine (Cardinal) - Buffer/Performer
**Role**: Team buffer, luck manipulation, morale support
**Base Stats**: High LCK, high MAG, moderate SPD
**Core Identity**: Performance-based support with dramatic flair and luck effects

**Move Progression**:
- **Dramatic Peck** → **Stage Presence** → **Showstopper**
  - Performance-based attacks that scale with audience (party) approval
- **Fashion Pose** → **Dazzling Display** → **Mesmerizing Dance**
  - Charm and confusion effects scaling from single target to AoE control
- **Encore Performance** → **Grand Finale** → **Standing Ovation**
  - Escalating team buffs that build throughout the battle

**Skill Trees**:
```
Performance Branch (200/450/900 VA):
├─ Show Must Go On: Revive automatically with 1 HP when knocked out
├─ Center Stage: All enemy attacks redirect to Carmine for 2 turns
└─ Perfect Performance: All party abilities automatically succeed

Luck Branch (250/500/750 VA):
├─ Lucky Break: Reroll any failed action once per turn
├─ Fortune's Favor: Entire party gains +2 LCK for battle
└─ Miraculous: 5% chance each turn to instantly defeat all enemies

Charm Branch (300/600/1000 VA):
├─ Captivating: 25% chance each turn for random enemy to skip turn
├─ Inspiring Presence: Party gains +50% VirtuAcorns at end of battle
└─ Legendary Performance: Permanent +1 to all party member stats
```

## Integration with Main Game

### Relationship System Integration
- **Character Unlock Gates**: Characters join Acorn Hunt based on relationship levels
  - Level 1: Character becomes available for recruitment
  - Level 3: Unlock second skill tree branch
  - Level 5: Unlock ultimate moves and third skill tree branch
  - Max Level: Character gets unique passive ability in Acorn Hunt

### Cross-Progression Benefits
- **Main Game → Acorn Hunt**:
  - High relationship levels provide VirtuAcorn earning multipliers
  - Main game achievements unlock starting bonuses
  - Relationship sidequests can reward VirtuAcorns directly

- **Acorn Hunt → Main Game**:
  - Victories provide small relationship XP bonuses
  - Major achievements unlock cosmetic rewards for main game
  - Mastery levels could provide small idle game benefits

## Upgrade Costs & Economy

### Move Upgrade Costs
- **Tier 1 → Tier 2**: 100 VirtuAcorns per move
- **Tier 2 → Tier 3**: 250 VirtuAcorns per move
- **Ultimate Moves**: 500 VirtuAcorns (relationship level 5 required)

### Skill Tree Costs
- **First Tier**: 50-300 VirtuAcorns (varies by power level)
- **Second Tier**: 150-600 VirtuAcorns
- **Ultimate Tier**: 300-1200 VirtuAcorns

### Character Mastery
- **Overall Character Level**: Gained through use, unlocks cosmetic variations
- **Mastery Bonuses**: Permanent small stat boosts for reaching milestones
- **Prestige System**: Option to reset character progression for permanent account-wide bonuses

## Progression Philosophy

### Short-Term Satisfaction
- **Immediate Impact**: Every upgrade provides noticeable improvement
- **Clear Goals**: Visible progress toward next upgrade
- **Multiple Paths**: Several upgrade options available simultaneously

### Long-Term Engagement
- **Build Variety**: Multiple viable character builds
- **Team Synergy**: Character combinations unlock special interactions
- **Mastery Depth**: High-level play requires understanding character synergies

### Player Agency
- **Meaningful Choices**: Upgrade decisions significantly impact gameplay
- **Respec Options**: Ability to reset and try different builds (at cost)
- **Flexible Teams**: No single "optimal" team composition

## Implementation Priority

### Phase 1: Foundation (Immediate)
1. VirtuAcorn currency system
2. Basic skill trees and data structures
3. Move progression framework
4. Upgrade UI screens

### Phase 2: Character Systems (Short-term)
1. Complete move definitions with progression
2. Skill tree effects implementation
3. Character unlock integration with relationships
4. Progression persistence

### Phase 3: Advanced Features (Medium-term)
1. Mastery levels and prestige systems
2. Character synergy bonuses
3. Advanced UI with build planning
4. Cross-game integration features

This progression system transforms Acorn Hunt from a simple battle mini-game into a deep character development experience that encourages long-term engagement while integrating meaningfully with the main game's relationship mechanics.