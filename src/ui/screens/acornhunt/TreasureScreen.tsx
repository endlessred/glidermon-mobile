import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../../../data/hooks/useTheme';
import { RunState, RelicDef } from '../../../game/acornhunt/types';
import { generateRelicChoices, RELICS, checkPartyRelicRequirements } from '../../../game/acornhunt/relics';
import { CHARACTERS } from '../../../game/acornhunt/characters';
import { SeededRNG } from '../../../game/acornhunt/rng';

interface TreasureScreenProps {
  run: RunState;
  onRelicSelected: (relicId: string) => void;
  onSkip: () => void;
}

export function TreasureScreen({ run, onRelicSelected, onSkip }: TreasureScreenProps) {
  const { colors, typography, spacing } = useTheme();
  const [availableRelics, setAvailableRelics] = useState<RelicDef[]>([]);
  const [selectedRelic, setSelectedRelic] = useState<string | null>(null);

  // Calculate current party stats (including relic bonuses)
  const getPartyStats = () => {
    return run.party.map(characterId => {
      const character = CHARACTERS[characterId];
      if (!character) return character?.base || { STR: 0, SPD: 0, MAG: 0, DEF: 0, LCK: 0, HP: 0, HPMax: 0 };

      // Apply stat bonuses from relics
      const stats = { ...character.base };
      Object.entries(run.modifiers.statBonuses).forEach(([stat, bonus]) => {
        if (bonus && stats[stat as keyof typeof stats] !== undefined) {
          (stats as any)[stat] += bonus;
        }
      });

      return stats;
    });
  };

  useEffect(() => {
    // Generate relic choices for this treasure node
    const rng = new SeededRNG(run.seed + run.nodeIndex + 1000);
    const choices = generateRelicChoices(() => rng.next());

    // Filter out relics already owned
    const filtered = choices.filter(relic => !run.relics.includes(relic.id));

    // If all are owned, add some random ones
    if (filtered.length === 0) {
      const allRelics = Object.values(RELICS);
      const available = allRelics.filter(relic => !run.relics.includes(relic.id));
      if (available.length > 0) {
        for (let i = 0; i < 3 && i < available.length; i++) {
          const randomIndex = Math.floor(rng.next() * available.length);
          filtered.push(available[randomIndex]);
        }
      }
    }

    setAvailableRelics(filtered.slice(0, 3)); // Ensure max 3 choices
  }, [run.seed, run.nodeIndex, run.relics]);

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return colors.gray?.[500] || '#9ca3af';
      case 'uncommon': return colors.status?.success || '#22c55e';
      case 'rare': return colors.primary[500][500] || '#3b82f6';
      case 'legendary': return colors.accent?.purple || '#a855f7';
      default: return colors.text.secondary;
    }
  };

  const getRarityGlow = (rarity: string): string => {
    const baseColor = getRarityColor(rarity);
    return baseColor + '20'; // Add transparency
  };

  const handleRelicSelect = (relicId: string) => {
    const relic = availableRelics.find(r => r.id === relicId);
    if (!relic) return;

    console.log('Relic selected:', relicId, relic.name);
    // Direct selection without Alert for now
    onRelicSelected(relicId);
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Treasure',
      'Are you sure you want to skip this treasure? You won\'t get another chance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: onSkip
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray[300] }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          📦 Treasure Found!
        </Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.skipButton, { color: colors.text.secondary }]}>
            Skip →
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Introduction */}
        <View style={[styles.introContainer, { backgroundColor: colors.background.card }]}>
          <Text style={[styles.introTitle, { color: colors.text.primary }]}>
            ✨ Ancient Treasures ✨
          </Text>
          <Text style={[styles.introText, { color: colors.text.secondary }]}>
            You've discovered a hidden cache! Choose one relic to aid you on your journey.
            Each relic provides unique bonuses and abilities.
          </Text>
        </View>

        {/* Current Relics */}
        {run.relics.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              🎒 Your Current Relics ({run.relics.length})
            </Text>
            <View style={styles.currentRelicsContainer}>
              {run.relics.map((relicId, index) => {
                const relic = RELICS[relicId];
                if (!relic) return null;

                return (
                  <View
                    key={index}
                    style={[
                      styles.currentRelicItem,
                      {
                        backgroundColor: getRarityGlow(relic.rarity),
                        borderColor: getRarityColor(relic.rarity)
                      }
                    ]}
                  >
                    <Text style={styles.currentRelicEmoji}>{relic.emoji}</Text>
                    <Text style={[styles.currentRelicName, { color: colors.text.primary }]}>
                      {relic.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Available Relics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            🎁 Choose Your Treasure
          </Text>

          {availableRelics.length === 0 ? (
            <View style={[styles.noRelicsContainer, { backgroundColor: colors.background.card }]}>
              <Text style={[styles.noRelicsText, { color: colors.text.secondary }]}>
                No new relics available. You've collected them all!
              </Text>
              <TouchableOpacity
                style={[styles.continueButton, { backgroundColor: colors.primary[500] }]}
                onPress={onSkip}
              >
                <Text style={[styles.continueButtonText, { color: colors.text.inverse }]}>
                  Continue Journey
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            availableRelics.map((relic) => {
              const partyStats = getPartyStats();
              const requirementCheck = checkPartyRelicRequirements(relic, partyStats);
              const requirementsMet = requirementCheck.anyCharacterMeetsRequirements;

              return (
                <TouchableOpacity
                  key={relic.id}
                  style={[
                    styles.relicCard,
                    {
                      backgroundColor: getRarityGlow(relic.rarity),
                      borderColor: getRarityColor(relic.rarity),
                      borderWidth: 2,
                      opacity: (!relic.requires || requirementsMet) ? 1 : 0.7
                    }
                  ]}
                  onPress={() => {
                    console.log('TouchableOpacity pressed for relic:', relic.id);
                    handleRelicSelect(relic.id);
                  }}
                  activeOpacity={0.7}
                >
                {/* Relic Header */}
                <View style={styles.relicHeader}>
                  <Text style={styles.relicEmoji}>{relic.emoji}</Text>
                  <View style={styles.relicInfo}>
                    <Text style={[styles.relicName, { color: colors.text.primary }]}>
                      {relic.name}
                    </Text>
                    <Text style={[
                      styles.relicRarity,
                      { color: getRarityColor(relic.rarity) }
                    ]}>
                      {relic.rarity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.tapHint, { color: colors.text.secondary }]}>
                    Tap to select
                  </Text>
                </View>

                {/* Relic Description */}
                <Text style={[styles.relicDescription, { color: colors.text.secondary }]}>
                  {relic.description}
                </Text>

                {/* Requirements */}
                {relic.requires && (() => {
                  const partyStats = getPartyStats();
                  const requirementCheck = checkPartyRelicRequirements(relic, partyStats);
                  const anyMet = requirementCheck.anyCharacterMeetsRequirements;

                  return (
                    <View style={styles.requirementsContainer}>
                      <View style={styles.requirementsHeader}>
                        <Text style={[styles.requirementsLabel, { color: colors.text.secondary }]}>
                          Requirements:
                        </Text>
                        <View style={[
                          styles.requirementStatus,
                          { backgroundColor: anyMet ? (colors.status?.success + '20' || '#22c55e20') : (colors.status?.error + '20' || '#ef444420') }
                        ]}>
                          <Text style={[
                            styles.requirementStatusText,
                            { color: anyMet ? (colors.status?.success || '#22c55e') : (colors.status?.error || '#ef4444') }
                          ]}>
                            {anyMet ? '✅ Met' : '❌ Not Met'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.requirementsList}>
                        {Object.entries(relic.requires).map(([stat, value]) => {
                          // Find the best character for this stat
                          const bestCharacterValue = Math.max(...partyStats.map(stats => stats[stat as keyof typeof stats] || 0));
                          const isStatMet = bestCharacterValue >= value;

                          return (
                            <View
                              key={stat}
                              style={[
                                styles.requirement,
                                {
                                  backgroundColor: isStatMet ? (colors.status?.success + '15' || '#22c55e15') : (colors.status?.error + '15' || '#ef444415'),
                                  borderColor: isStatMet ? (colors.status?.success + '40' || '#22c55e40') : (colors.status?.error + '40' || '#ef444440')
                                }
                              ]}
                            >
                              <Text style={[styles.requirementText, { color: colors.text.primary }]}>
                                {stat} ≥ {value}
                              </Text>
                              <Text style={[
                                styles.requirementValue,
                                { color: isStatMet ? (colors.status?.success || '#22c55e') : (colors.status?.error || '#ef4444') }
                              ]}>
                                (Best: {bestCharacterValue})
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      {/* Character breakdown for requirements */}
                      {relic.requires && (
                        <View style={styles.characterBreakdown}>
                          <Text style={[styles.characterBreakdownLabel, { color: colors.text.secondary }]}>
                            Party Status:
                          </Text>
                          <View style={styles.characterList}>
                            {run.party.map((characterId, index) => {
                              const character = CHARACTERS[characterId];
                              const characterStats = partyStats[index];
                              const characterCheck = requirementCheck.characterResults[index];

                              return (
                                <View key={characterId} style={[
                                  styles.characterRequirement,
                                  { backgroundColor: characterCheck.met ? (colors.status?.success + '10' || '#22c55e10') : (colors.gray?.[500] + '10' || '#6b728010') }
                                ]}>
                                  <Text style={styles.characterEmoji}>{character.emoji}</Text>
                                  <Text style={[styles.characterName, { color: colors.text.primary }]}>
                                    {character.name}
                                  </Text>
                                  <Text style={[
                                    styles.characterStatus,
                                    { color: characterCheck.met ? (colors.status?.success || '#22c55e') : (colors.gray?.[500] || '#6b7280') }
                                  ]}>
                                    {characterCheck.met ? '✓' : '✕'}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {!anyMet && (
                        <Text style={[styles.requirementHint, { color: colors.text.secondary }]}>
                          💡 This relic won't be as effective without meeting requirements
                        </Text>
                      )}
                    </View>
                  );
                })()}

                {/* Selection Indicator */}
                <View style={styles.selectionIndicator}>
                  <Text style={[styles.selectText, { color: getRarityColor(relic.rarity) }]}>
                    🎁 Select This Relic
                  </Text>
                </View>
              </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Rarity Guide */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            💎 Rarity Guide
          </Text>
          <View style={[styles.rarityGuide, { backgroundColor: colors.background.card }]}>
            {[
              { rarity: 'common', desc: 'Basic bonuses and effects' },
              { rarity: 'uncommon', desc: 'Moderate bonuses with conditions' },
              { rarity: 'rare', desc: 'Powerful effects with requirements' },
              { rarity: 'legendary', desc: 'Game-changing abilities' }
            ].map(({ rarity, desc }) => (
              <View key={rarity} style={styles.rarityItem}>
                <View
                  style={[
                    styles.rarityDot,
                    { backgroundColor: getRarityColor(rarity) }
                  ]}
                />
                <Text style={[styles.rarityName, { color: colors.text.primary }]}>
                  {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                </Text>
                <Text style={[styles.rarityDesc, { color: colors.text.secondary }]}>
                  {desc}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  skipButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  introContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  currentRelicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currentRelicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  currentRelicEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  currentRelicName: {
    fontSize: 12,
    fontWeight: '600',
  },
  relicCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  relicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  relicEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  relicInfo: {
    flex: 1,
  },
  relicName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  relicRarity: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tapHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  relicDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
  },
  requirementsContainer: {
    marginBottom: 12,
  },
  requirementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  requirementStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requirementsList: {
    gap: 6,
  },
  requirement: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requirementText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  requirementHint: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
    paddingVertical: 4,
  },
  characterBreakdown: {
    marginTop: 8,
  },
  characterBreakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  characterList: {
    flexDirection: 'row',
    gap: 6,
  },
  characterRequirement: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  characterEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  characterName: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  characterStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectionIndicator: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  selectText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  noRelicsContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  noRelicsText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  continueButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rarityGuide: {
    padding: 16,
    borderRadius: 12,
  },
  rarityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rarityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  rarityName: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
    marginRight: 12,
  },
  rarityDesc: {
    fontSize: 12,
    flex: 1,
  },
});