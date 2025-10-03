import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../../../data/hooks/useTheme';
import { RunState, AcornHuntUIState, Combatant } from '../../../game/acornhunt/types';
import { BattleEngine, BattleResult, createCombatant } from '../../../game/acornhunt/battleSystem';
import { CHARACTERS } from '../../../game/acornhunt/characters';
import { generateEncounter } from '../../../game/acornhunt/enemies';
import { SeededRNG } from '../../../game/acornhunt/rng';

interface BattleScreenProps {
  run: RunState;
  uiState: AcornHuntUIState;
  onBattleComplete: (result: BattleResult) => void;
  onUpdateRun: (run: RunState) => void;
  onUpdateUI: (uiState: AcornHuntUIState) => void;
}

export function BattleScreen({
  run,
  uiState,
  onBattleComplete,
  onUpdateRun,
  onUpdateUI
}: BattleScreenProps) {
  const { colors, typography, spacing } = useTheme();
  const [battleEngine, setBattleEngine] = useState<BattleEngine | null>(null);
  const [battleState, setBattleState] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatingCombatants, setAnimatingCombatants] = useState<Set<string>>(new Set());
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Initialize battle
  useEffect(() => {
    if (!battleEngine) {
      initializeBattle();
    }

    // Cleanup animations on unmount
    return () => {
      animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      animationTimeouts.current = [];
    };
  }, []);

  const initializeBattle = () => {
    // Create party combatants with persisted HP
    const allies = run.party.map((characterId, index) => {
      const character = CHARACTERS[characterId];
      const combatant = createCombatant(`ally_${index}`, character, false);

      // Restore HP from run state if available
      if (run.partyHP && run.partyHP[characterId]) {
        combatant.stats.HP = run.partyHP[characterId].current;
        combatant.stats.HPMax = run.partyHP[characterId].max;
        console.log(`🔄 Restored HP for ${characterId}: ${combatant.stats.HP}/${combatant.stats.HPMax}`);
      }

      return combatant;
    });

    // Generate enemies based on current node
    const currentNode = run.map[run.nodeIndex];
    const rng = new SeededRNG(run.seed + run.nodeIndex);
    const enemyDefs = generateEncounter(run.nodeIndex, run.map.length, () => rng.next(), currentNode?.id);

    const enemies = enemyDefs.map((enemyDef, index) => {
      return createCombatant(`enemy_${index}`, enemyDef, true);
    });

    // Create battle engine
    const engine = new BattleEngine(run, allies, enemies);
    setBattleEngine(engine);
    setBattleState(engine.getBattleState());
  };

  const processBattleTurn = async () => {
    if (!battleEngine || isProcessing) return;

    console.log('Starting battle...');
    setIsProcessing(true);

    try {
      const result = await battleEngine.runBattleWithAnimations({
        onActionStart: (action) => {
          // Animate the source combatant
          setAnimatingCombatants(prev => new Set([...prev, action.source]));

          const timeout = setTimeout(() => {
            setAnimatingCombatants(prev => {
              const newSet = new Set(prev);
              newSet.delete(action.source);
              return newSet;
            });
          }, 300); // Animation duration

          animationTimeouts.current.push(timeout);
        },
        onTurnDelay: async () => {
          // Add delay between turns based on speed setting
          const delay = run.speed === 1 ? 800 : run.speed === 2 ? 400 : 200;
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, delay);
            animationTimeouts.current.push(timeout);
          });
        },
        onStateUpdate: () => {
          // Update battle state during combat
          setBattleState(battleEngine.getBattleState());
        }
      });

      console.log('Battle result:', result);
      setBattleState(battleEngine.getBattleState());

      // Update party HP in the run after battle
      const updatedRun = { ...run };
      const battleState = battleEngine.getBattleState();
      const allies = battleState.combatants.filter(c => !c.isEnemy);

      // Update partyHP with post-battle HP
      allies.forEach((ally, index) => {
        const characterId = run.party[index];
        if (updatedRun.partyHP && updatedRun.partyHP[characterId]) {
          const oldHP = updatedRun.partyHP[characterId].current;
          updatedRun.partyHP[characterId].current = ally.stats.HP;
          console.log(`💾 Saved HP for ${characterId}: ${oldHP} → ${ally.stats.HP}/${updatedRun.partyHP[characterId].max}`);
        }
      });

      // Apply post-battle healing if any
      if (updatedRun.modifiers.postBattleHealPct > 0) {
        Object.keys(updatedRun.partyHP).forEach(characterId => {
          const hpData = updatedRun.partyHP[characterId];
          const healAmount = Math.floor(hpData.max * updatedRun.modifiers.postBattleHealPct / 100);
          hpData.current = Math.min(hpData.max, hpData.current + healAmount);
        });
        console.log(`🩹 Post-battle healing: ${updatedRun.modifiers.postBattleHealPct}%`);
      }

      onUpdateRun(updatedRun);

      setTimeout(() => {
        console.log('Completing battle with result:', result);
        onBattleComplete(result);
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      console.error('Battle error:', error);
      Alert.alert('Battle Error', 'Something went wrong during battle.');
      setIsProcessing(false);
    }
  };

  const toggleSpeed = () => {
    const newSpeed = run.speed === 1 ? 2 : run.speed === 2 ? 4 : 1;
    const updatedRun = { ...run, speed: newSpeed };
    onUpdateRun(updatedRun);
  };

  if (!battleState) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>
            Preparing for battle...
          </Text>
        </View>
      </View>
    );
  }

  const allies = battleState.combatants.filter((c: Combatant) => !c.isEnemy);
  const enemies = battleState.combatants.filter((c: Combatant) => c.isEnemy);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray[300] }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Battle!</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={[styles.speedButton, { backgroundColor: colors.background.card }]}
            onPress={toggleSpeed}
          >
            <Text style={[styles.speedText, { color: colors.text.primary }]}>
              {run.speed}× Speed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Battle Arena */}
      <View style={styles.arena}>
        {/* Allies Side */}
        <View style={styles.alliesSide}>
          <Text style={[styles.sideTitle, { color: colors.text.primary }]}>Your Party</Text>
          <View style={styles.combatantGrid}>
            {allies.map((ally: Combatant) => (
              <CombatantCard
                key={ally.id}
                combatant={ally}
                colors={colors}
                isAlly={true}
                isAnimating={animatingCombatants.has(ally.id)}
              />
            ))}
          </View>
        </View>

        {/* VS Divider */}
        <View style={styles.vsDivider}>
          <Text style={[styles.vsText, { color: colors.text.secondary }]}>⚔️</Text>
        </View>

        {/* Enemies Side */}
        <View style={styles.enemiesSide}>
          <Text style={[styles.sideTitle, { color: colors.text.primary }]}>Enemies</Text>
          <View style={styles.combatantGrid}>
            {enemies.map((enemy: Combatant) => (
              <CombatantCard
                key={enemy.id}
                combatant={enemy}
                colors={colors}
                isAlly={false}
                isAnimating={animatingCombatants.has(enemy.id)}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Battle Log */}
      <View style={[styles.battleLog, { backgroundColor: colors.background.card }]}>
        <Text style={[styles.logTitle, { color: colors.text.primary }]}>Battle Log</Text>
        <ScrollView style={styles.logScroll}>
          {battleState.battleLog.map((action: any, index: number) => (
            <Text
              key={index}
              style={[styles.logEntry, { color: colors.text.secondary }]}
            >
              {action.message}
              {action.crit && ' ✨'}
              {action.miss && ' 💨'}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* Battle Controls */}
      <View style={styles.controls}>
        {!battleState.isOver ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: isProcessing ? colors.background.card : colors.primary[500],
                opacity: isProcessing ? 0.5 : 1
              }
            ]}
            onPress={processBattleTurn}
            disabled={isProcessing}
          >
            <Text style={[
              styles.actionButtonText,
              { color: isProcessing ? colors.text.secondary : colors.text.inverse }
            ]}>
              {isProcessing ? 'Processing...' : 'Continue Battle'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary[500] }]}
            onPress={processBattleTurn}
          >
            <Text style={[styles.actionButtonText, { color: colors.text.inverse }]}>
              Start Battle!
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function CombatantCard({
  combatant,
  colors,
  isAlly,
  isAnimating = false
}: {
  combatant: Combatant;
  colors: any;
  isAlly: boolean;
  isAnimating?: boolean;
}) {
  const hpPercent = combatant.stats.HP / combatant.stats.HPMax;
  const isAlive = combatant.stats.HP > 0;

  const getHealthColor = (percent: number) => {
    if (percent > 0.6) return colors.status?.success || '#4ade80';
    if (percent > 0.3) return colors.status?.warning || '#facc15';
    return colors.status?.error || '#ef4444';
  };

  return (
    <View style={[
      styles.combatantCard,
      {
        backgroundColor: colors.background.card,
        opacity: isAlive ? 1 : 0.5,
        borderColor: isAlly ? (colors.status?.success || '#4ade80') : (colors.status?.error || '#ef4444')
      }
    ]}>
      <Text style={[styles.combatantEmoji, isAnimating && styles.combatantEmojiAnimating]}>
        {isAnimating ? `    ${combatant.character.emoji}` : combatant.character.emoji}
        {!isAlive && ' 💀'}
      </Text>
      <Text style={[styles.combatantName, { color: colors.text.primary }]}>
        {combatant.character.name}
      </Text>

      {/* Health Bar */}
      <View style={styles.healthContainer}>
        <View style={[styles.healthBar, { backgroundColor: colors.gray[300] }]}>
          <View
            style={[
              styles.healthFill,
              {
                backgroundColor: getHealthColor(hpPercent),
                width: `${Math.max(0, hpPercent * 100)}%`
              }
            ]}
          />
        </View>
        <Text style={[styles.healthText, { color: colors.text.secondary }]}>
          {combatant.stats.HP}/{combatant.stats.HPMax}
        </Text>
      </View>

      {/* Status Effects */}
      {combatant.statusEffects.length > 0 && (
        <View style={styles.statusEffects}>
          {combatant.statusEffects.map((effect, index) => (
            <View key={index} style={[styles.statusBadge, { backgroundColor: colors.gray[300] }]}>
              <Text style={[styles.statusText, { color: colors.text.primary }]}>
                {effect.name} ({effect.ttl})
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Last Action */}
      {combatant.lastAction && (
        <Text style={[styles.lastAction, { color: colors.text.secondary }]}>
          {combatant.lastAction}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerControls: {
    flexDirection: 'row',
    gap: 8,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  arena: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  alliesSide: {
    flex: 1,
    marginRight: 8,
  },
  enemiesSide: {
    flex: 1,
    marginLeft: 8,
  },
  sideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  combatantGrid: {
    gap: 8,
  },
  vsDivider: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  combatantCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 8,
  },
  combatantEmoji: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 4,
  },
  combatantEmojiAnimating: {
    transform: [{ translateX: 8 }],
  },
  combatantName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  healthContainer: {
    marginBottom: 8,
  },
  healthBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  healthFill: {
    height: '100%',
    borderRadius: 3,
  },
  healthText: {
    fontSize: 10,
    textAlign: 'center',
  },
  statusEffects: {
    gap: 4,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    textAlign: 'center',
  },
  lastAction: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  battleLog: {
    height: 120,
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logScroll: {
    flex: 1,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  controls: {
    padding: 16,
    paddingTop: 0,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
  },
});