import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../../data/hooks/useTheme';
import { useProgressionStore } from '../../data/stores/progressionStore';
import { useLevelUpStore } from '../../data/stores/levelUpStore';
import { RunState, CharacterId, AcornHuntUIState } from '../../game/acornhunt/types';
import { CHARACTERS } from '../../game/acornhunt/characters';
import { generateAcornHuntMap } from '../../game/acornhunt/mapGenerator';
import { applyAllRelics } from '../../game/acornhunt/relics';
import { ProgressionManager, createDefaultProgression } from '../../game/acornhunt/progressionManager';
import { PartySelectScreen } from './acornhunt/PartySelectScreen';
import { MapScreen } from './acornhunt/MapScreen';
import { BattleScreen } from './acornhunt/BattleScreen';
import { TreasureScreen } from './acornhunt/TreasureScreen';
import { EventScreen } from './acornhunt/EventScreen';
import { ResultsScreen } from './acornhunt/ResultsScreen';
import { CharacterProgressionScreen } from './acornhunt/CharacterProgressionScreen';

interface AcornHuntScreenProps {
  navigation?: any;
}

export default function AcornHuntScreen({ navigation }: AcornHuntScreenProps = {}) {
  const { colors, typography, spacing } = useTheme();
  const grantAcorns = useProgressionStore(s => s.grantAcorns);
  const currentAcorns = useProgressionStore(s => s.acorns);
  const currentLevel = useProgressionStore(s => s.level);
  const enqueueLevel = useLevelUpStore(s => s.enqueue);

  const [currentRun, setCurrentRun] = useState<RunState | null>(null);
  const [uiState, setUIState] = useState<AcornHuntUIState>({
    currentScreen: 'party_select',
    battleLog: [],
    showSpeedControls: true
  });

  // Progression system (would come from persistent storage in final implementation)
  const [progressionData, setProgressionData] = useState(createDefaultProgression());
  const progressionManager = new ProgressionManager(progressionData);

  // Initialize new run
  const startNewRun = (selectedParty: CharacterId[]) => {
    const seed = Date.now();
    const map = generateAcornHuntMap(seed);

    const fullParty = ['player', ...selectedParty];

    // Initialize party HP tracking
    const partyHP: Record<string, { current: number; max: number }> = {};
    fullParty.forEach(characterId => {
      const character = CHARACTERS[characterId];
      if (character) {
        partyHP[characterId] = {
          current: character.base.HP,
          max: character.base.HPMax
        };
      }
    });

    const newRun: RunState = {
      seed,
      party: fullParty,
      partyHP,
      relics: [],
      modifiers: {
        damageMult: 1.0,
        critChanceBonus: 0,
        dodgeBonus: 0,
        healPerTurn: 0,
        postBattleHealPct: 0,
        acornDropMult: 1.0,
        statBonuses: {},
        hooks: {}
      },
      map,
      nodeIndex: 0,
      rewards: { acorns: 0, shards: 0, virtuAcorns: 0 },
      speed: 1,
      status: 'active'
    };

    // Apply any starting relics (ensures consistency)
    applyAllRelics(newRun);

    // Apply character progression effects
    progressionManager.applyProgressionToRun(newRun);

    setCurrentRun(newRun);
    setUIState(prev => ({ ...prev, currentScreen: 'map' }));
  };

  // Navigate to different screens
  const navigateToScreen = (screen: AcornHuntUIState['currentScreen']) => {
    setUIState(prev => ({ ...prev, currentScreen: screen }));
  };

  // Complete the run and grant rewards
  const completeRun = (finalRewards: { acorns: number; shards: number; virtuAcorns: number }, victory: boolean = true) => {
    if (finalRewards.acorns > 0) {
      // Grant acorns to progression store
      grantAcorns(finalRewards.acorns);

      // Calculate XP bonus (1 XP per 2 acorns earned)
      const xpBonus = Math.floor(finalRewards.acorns / 2);
      if (xpBonus > 0) {
        // This would normally be handled by progressionStore.onEgvsTick
        // For now, we'll just grant the acorns and let the normal progression handle XP
      }
    }

    // Add VirtuAcorns to the total progression currency
    if (finalRewards.virtuAcorns > 0) {
      progressionManager.addVirtuAcorns(finalRewards.virtuAcorns);
      setProgressionData({...progressionData}); // Force re-render
    }

    // Mark run with appropriate status
    if (currentRun) {
      setCurrentRun({
        ...currentRun,
        status: victory ? 'complete' : 'abandoned',
        rewards: finalRewards
      });
    }

    // Show results screen
    setUIState(prev => ({ ...prev, currentScreen: 'results' }));
  };

  // Handle VirtuAcorn spending for character upgrades
  const handleUpgradeMove = (characterId: string, moveId: string, cost: number) => {
    // Find the old move to replace (assume it's the base version)
    const oldMoveId = moveId.replace(/_(tier[23]|advanced|ultimate)$/, '');
    if (progressionManager.upgradeMove(characterId as CharacterId, oldMoveId, moveId, cost)) {
      setProgressionData({...progressionData}); // Force re-render
    }
  };

  const handleUnlockSkill = (characterId: string, skillId: string, cost: number) => {
    if (progressionManager.unlockSkill(characterId as CharacterId, skillId, cost)) {
      setProgressionData({...progressionData}); // Force re-render
    }
  };

  // Exit to main menu
  const exitToMenu = () => {
    Alert.alert(
      'Exit Acorn Hunt',
      'Are you sure you want to exit? Progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            setCurrentRun(null);
            setUIState({
              currentScreen: 'party_select',
              battleLog: [],
              showSpeedControls: true
            });
          }
        }
      ]
    );
  };

  // Render current screen based on state
  const renderCurrentScreen = () => {
    switch (uiState.currentScreen) {
      case 'party_select':
        return (
          <PartySelectScreen
            onPartySelected={startNewRun}
            onBack={() => {
              // Reset to party select if navigation is not available
              setCurrentRun(null);
              setUIState({
                currentScreen: 'party_select',
                battleLog: [],
                showSpeedControls: true
              });
            }}
            onProgression={() => navigateToScreen('progression')}
          />
        );

      case 'map':
        return currentRun ? (
          <MapScreen
            run={currentRun}
            onNodeSelected={(nodeId) => {
              const node = currentRun.map.find(n => n.id === nodeId);
              if (!node) return;

              // Update the run's node index to the selected node
              const nodeIndex = currentRun.map.findIndex(n => n.id === nodeId);
              if (nodeIndex !== -1) {
                const updatedRun = { ...currentRun };
                updatedRun.nodeIndex = nodeIndex;
                setCurrentRun(updatedRun);
              }

              // Navigate based on node type
              switch (node.type) {
                case 'battle':
                  navigateToScreen('battle');
                  break;
                case 'treasure':
                  navigateToScreen('treasure');
                  break;
                case 'event':
                  navigateToScreen('event');
                  break;
                case 'boss':
                  navigateToScreen('battle');
                  break;
              }
            }}
            onExit={exitToMenu}
          />
        ) : null;

      case 'battle':
        return currentRun ? (
          <BattleScreen
            run={currentRun}
            uiState={uiState}
            onBattleComplete={(result) => {
              // Mark the current node as completed
              const updatedRun = { ...currentRun };
              const currentNodeIndex = updatedRun.nodeIndex;
              if (updatedRun.map[currentNodeIndex]) {
                updatedRun.map[currentNodeIndex].completed = true;
              }

              if (result.victory) {
                // Update rewards with battle rewards
                updatedRun.rewards.acorns += result.acornsEarned;
                updatedRun.rewards.virtuAcorns += result.virtuAcornsEarned;

                setCurrentRun(updatedRun);

                // Check if it's the boss fight
                const currentNode = updatedRun.map[currentNodeIndex];
                if (currentNode?.type === 'boss') {
                  completeRun(updatedRun.rewards, true);
                } else {
                  navigateToScreen('map');
                }
              } else {
                // Battle lost - end run with defeat status
                setCurrentRun(updatedRun);
                completeRun({
                  acorns: Math.floor(updatedRun.rewards.acorns * 0.5),
                  shards: 0,
                  virtuAcorns: updatedRun.rewards.virtuAcorns
                }, false);
              }
            }}
            onUpdateRun={(updatedRun) => setCurrentRun(updatedRun)}
            onUpdateUI={(updatedUI) => setUIState(updatedUI)}
          />
        ) : null;

      case 'treasure':
        return currentRun ? (
          <TreasureScreen
            run={currentRun}
            onRelicSelected={(relicId) => {
              // Add relic to run and apply its effects
              const updatedRun = { ...currentRun };
              updatedRun.relics.push(relicId);

              // Apply all relics to ensure new relic effects are active
              applyAllRelics(updatedRun);

              // Mark current node as completed
              if (updatedRun.map[updatedRun.nodeIndex]) {
                updatedRun.map[updatedRun.nodeIndex].completed = true;
              }

              setCurrentRun(updatedRun);
              navigateToScreen('map');
            }}
            onSkip={() => {
              if (currentRun) {
                const updatedRun = { ...currentRun };

                // Mark current node as completed
                if (updatedRun.map[updatedRun.nodeIndex]) {
                  updatedRun.map[updatedRun.nodeIndex].completed = true;
                }

                setCurrentRun(updatedRun);
                navigateToScreen('map');
              }
            }}
          />
        ) : null;

      case 'event':
        return currentRun ? (
          <EventScreen
            run={currentRun}
            onEventComplete={(updatedRun) => {
              // Mark current node as completed
              if (updatedRun.map[updatedRun.nodeIndex]) {
                updatedRun.map[updatedRun.nodeIndex].completed = true;
              }

              setCurrentRun(updatedRun);
              navigateToScreen('map');
            }}
          />
        ) : null;

      case 'results':
        return currentRun ? (
          <ResultsScreen
            run={currentRun}
            onPlayAgain={() => {
              setCurrentRun(null);
              setUIState({
                currentScreen: 'party_select',
                battleLog: [],
                showSpeedControls: true
              });
            }}
            onExit={() => {
              // Reset to party select state
              setCurrentRun(null);
              setUIState({
                currentScreen: 'party_select',
                battleLog: [],
                showSpeedControls: true
              });
            }}
          />
        ) : null;

      case 'progression':
        return (
          <CharacterProgressionScreen
            availableVirtuAcorns={progressionManager.getAvailableVirtuAcorns()}
            getUnlockedSkills={(characterId) => progressionManager.getUnlockedSkills(characterId)}
            getCurrentMoves={(characterId) => progressionManager.getCurrentMoves(characterId)}
            onUpgradeMove={(characterId, moveId, cost) => handleUpgradeMove(characterId, moveId, cost)}
            onUnlockSkill={(characterId, skillId, cost) => handleUnlockSkill(characterId, skillId, cost)}
            onBack={() => setUIState(prev => ({ ...prev, currentScreen: 'party_select' }))}
          />
        );

      default:
        return (
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[typography.body, { color: colors.text }]}>
              Unknown screen state
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderCurrentScreen()}
    </SafeAreaView>
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
  exitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  }
});