import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useTheme } from '../../../data/hooks/useTheme';
import { RunState } from '../../../game/acornhunt/types';
import { CHARACTERS } from '../../../game/acornhunt/characters';
import { RELICS } from '../../../game/acornhunt/relics';

interface ResultsScreenProps {
  run: RunState;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function ResultsScreen({ run, onPlayAgain, onExit }: ResultsScreenProps) {
  const { colors, typography, spacing } = useTheme();

  const isVictory = run.status === 'complete';
  const finalNode = run.map[run.map.length - 1];
  const isUnlockAwardEligible = run.rewards.acorns >= 100;

  const getRunSummary = () => {
    return {
      nodesCompleted: run.nodeIndex + 1,
      totalNodes: run.map.length,
      acornsEarned: run.rewards.acorns,
      virtuAcornsEarned: run.rewards.virtuAcorns,
      relicsCollected: run.relics.length,
      completionRate: Math.round(((run.nodeIndex + 1) / run.map.length) * 100)
    };
  };

  const summary = getRunSummary();

  const getPerformanceRating = () => {
    if (summary.completionRate === 100 && summary.acornsEarned >= 150) return '🌟 Legendary';
    if (summary.completionRate === 100 && summary.acornsEarned >= 100) return '⭐ Excellent';
    if (summary.completionRate >= 80) return '✨ Great';
    if (summary.completionRate >= 60) return '👍 Good';
    if (summary.completionRate >= 40) return '👌 Fair';
    return '💪 Keep Trying';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {isVictory ? '🎉 Victory!' : '💔 Adventure Ended'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isVictory
              ? 'You have conquered the Hollow Acorn and saved the forest!'
              : 'Your journey ends here, but your courage was admirable.'
            }
          </Text>
          <Text style={[styles.performanceRating, { color: colors.primary }]}>
            {getPerformanceRating()}
          </Text>
        </View>

        {/* Run Statistics */}
        <View style={[styles.statsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📊 Adventure Summary
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {summary.nodesCompleted}/{summary.totalNodes}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Nodes Completed
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                🌰 {summary.acornsEarned}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Acorns Earned
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                ✨ {summary.relicsCollected}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Relics Found
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {summary.completionRate}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Completion
              </Text>
            </View>
          </View>
        </View>

        {/* Party Performance */}
        <View style={[styles.partySection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            👥 Your Brave Party
          </Text>

          <View style={styles.partyGrid}>
            {run.party.map((characterId, index) => {
              const character = CHARACTERS[characterId];
              return (
                <View key={characterId} style={[styles.partyCard, { backgroundColor: colors.background }]}>
                  <Text style={styles.partyEmoji}>{character.emoji}</Text>
                  <Text style={[styles.partyName, { color: colors.text }]}>
                    {character.name}
                  </Text>
                  <Text style={[styles.partyRole, { color: colors.textSecondary }]}>
                    {index === 0 ? 'Leader' : 'Companion'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Collected Relics */}
        {run.relics.length > 0 && (
          <View style={[styles.relicsSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🎒 Treasures Collected
            </Text>

            <View style={styles.relicsGrid}>
              {run.relics.map((relicId, index) => {
                const relic = RELICS[relicId];
                if (!relic) return null;

                const getRarityColor = (rarity: string) => {
                  switch (rarity) {
                    case 'common': return '#9ca3af';
                    case 'uncommon': return '#22c55e';
                    case 'rare': return '#3b82f6';
                    case 'legendary': return '#a855f7';
                    default: return colors.textSecondary;
                  }
                };

                return (
                  <View
                    key={index}
                    style={[
                      styles.relicCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: getRarityColor(relic.rarity)
                      }
                    ]}
                  >
                    <Text style={styles.relicEmoji}>{relic.emoji}</Text>
                    <Text style={[styles.relicName, { color: colors.text }]}>
                      {relic.name}
                    </Text>
                    <Text style={[styles.relicRarity, { color: getRarityColor(relic.rarity) }]}>
                      {relic.rarity.toUpperCase()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Achievements */}
        <View style={[styles.achievementsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🏆 Achievements
          </Text>

          <View style={styles.achievementsList}>
            {isVictory && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>👑</Text>
                <Text style={[styles.achievementText, { color: colors.text }]}>
                  Forest Champion - Defeated the Hollow Acorn
                </Text>
              </View>
            )}

            {summary.acornsEarned >= 100 && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>💰</Text>
                <Text style={[styles.achievementText, { color: colors.text }]}>
                  Acorn Collector - Earned 100+ acorns
                </Text>
              </View>
            )}

            {summary.relicsCollected >= 3 && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>🗝️</Text>
                <Text style={[styles.achievementText, { color: colors.text }]}>
                  Treasure Hunter - Found 3+ relics
                </Text>
              </View>
            )}

            {summary.completionRate === 100 && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>🎯</Text>
                <Text style={[styles.achievementText, { color: colors.text }]}>
                  Completionist - Explored every node
                </Text>
              </View>
            )}

            {run.relics.some(id => RELICS[id]?.rarity === 'legendary') && (
              <View style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>⭐</Text>
                <Text style={[styles.achievementText, { color: colors.text }]}>
                  Legend Seeker - Found a legendary relic
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Rewards Summary */}
        <View style={[styles.rewardsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🎁 Final Rewards
          </Text>

          <View style={styles.rewardsList}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardEmoji}>🌰</Text>
              <Text style={[styles.rewardText, { color: colors.text }]}>
                {summary.acornsEarned} Acorns added to your collection
              </Text>
            </View>

            <View style={styles.rewardItem}>
              <Text style={styles.rewardEmoji}>🌰✨</Text>
              <Text style={[styles.rewardText, { color: colors.text }]}>
                {summary.virtuAcornsEarned} VirtuAcorns for character upgrades
              </Text>
            </View>

            {isUnlockAwardEligible && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardEmoji}>🆕</Text>
                <Text style={[styles.rewardText, { color: colors.primary }]}>
                  Bonus: New cosmetics available in shop!
                </Text>
              </View>
            )}

            <View style={styles.rewardItem}>
              <Text style={styles.rewardEmoji}>⭐</Text>
              <Text style={[styles.rewardText, { color: colors.text }]}>
                Experience points earned: {Math.floor(summary.acornsEarned * 0.5)}
              </Text>
            </View>
          </View>
        </View>

        {/* Story Epilogue */}
        <View style={[styles.epilogueSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📖 Your Legend
          </Text>
          <Text style={[styles.epilogueText, { color: colors.textSecondary }]}>
            {isVictory
              ? `The forest creatures will long remember the brave ${run.party[0]} and their companions ${run.party.slice(1).join(', ')}. Your victory over the Hollow Acorn has restored peace to the enchanted woods, and the acorns you collected will help rebuild what was lost. The relics you discovered will serve as reminders of your heroic journey.`
              : `Though your adventure ended before reaching the Hollow Acorn, your courage inspired many. The ${summary.acornsEarned} acorns you collected and the ${summary.relicsCollected} relics you found will aid future heroes who dare to venture into the mysterious forest. Your legacy lives on.`
            }
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.playAgainButton, { backgroundColor: colors.primary }]}
          onPress={onPlayAgain}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            🎮 Play Again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exitButton, { backgroundColor: colors.surface }]}
          onPress={onExit}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            🏠 Return Home
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  performanceRating: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  partySection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  partyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  partyCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  partyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  partyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partyRole: {
    fontSize: 12,
  },
  relicsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  relicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  relicCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  relicEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  relicName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  relicRarity: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  achievementsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  achievementText: {
    fontSize: 14,
    flex: 1,
  },
  rewardsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  rewardsList: {
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  rewardText: {
    fontSize: 14,
    flex: 1,
  },
  epilogueSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  epilogueText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'justify',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  playAgainButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});