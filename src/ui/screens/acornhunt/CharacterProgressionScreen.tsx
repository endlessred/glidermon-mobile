import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList
} from 'react-native';
import { useTheme } from '../../../data/hooks/useTheme';
import { CharacterId, SkillNode, MoveTier } from '../../../game/acornhunt/types';
import { CHARACTERS } from '../../../game/acornhunt/characters';
import { getSkillTree, canUnlockSkill } from '../../../game/acornhunt/skillTrees';
import { getUpgradeOptions, canUpgradeMove } from '../../../game/acornhunt/moves';

interface CharacterProgressionScreenProps {
  availableVirtuAcorns: number;
  getUnlockedSkills: (characterId: CharacterId) => string[];
  getCurrentMoves: (characterId: CharacterId) => string[];
  onUpgradeMove: (characterId: CharacterId, moveId: string, cost: number) => void;
  onUnlockSkill: (characterId: CharacterId, skillId: string, cost: number) => void;
  onBack: () => void;
}

type TabType = 'moves' | 'skills' | 'mastery';

export function CharacterProgressionScreen({
  availableVirtuAcorns,
  getUnlockedSkills,
  getCurrentMoves,
  onUpgradeMove,
  onUnlockSkill,
  onBack
}: CharacterProgressionScreenProps) {
  const { colors, typography, spacing } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('moves');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('player');

  const character = CHARACTERS[selectedCharacter];
  const skillTree = getSkillTree(selectedCharacter);
  const unlockedSkills = getUnlockedSkills(selectedCharacter);
  const currentMoves = getCurrentMoves(selectedCharacter);

  // Get available characters (for now, just the main ones with skill trees)
  const availableCharacters: CharacterId[] = ['player', 'sable', 'luma', 'orvus'];

  const renderMoveUpgrades = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          💪 Move Upgrades
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>
          Upgrade your character's abilities to more powerful versions
        </Text>

        {currentMoves.map(moveId => {
          const upgrades = getUpgradeOptions(moveId as any);
          const affordableUpgrades = canUpgradeMove(moveId as any, availableVirtuAcorns);

          return (
            <View key={moveId} style={[styles.moveSection, { backgroundColor: colors.background.card }]}>
              <Text style={[styles.moveTitle, { color: colors.text.primary }]}>
                {moveId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>

              {upgrades.length === 0 ? (
                <Text style={[styles.maxLevelText, { color: colors.text.secondary }]}>
                  ⭐ Max Level Reached
                </Text>
              ) : (
                upgrades.map(upgrade => (
                  <TouchableOpacity
                    key={upgrade.id}
                    style={[
                      styles.upgradeCard,
                      {
                        backgroundColor: colors.background.primary,
                        borderColor: affordableUpgrades.includes(upgrade) ? colors.primary[500] : colors.gray[300],
                        opacity: affordableUpgrades.includes(upgrade) ? 1 : 0.6
                      }
                    ]}
                    onPress={() => {
                      if (affordableUpgrades.includes(upgrade)) {
                        onUpgradeMove(selectedCharacter, upgrade.id, upgrade.cost);
                      }
                    }}
                    disabled={!affordableUpgrades.includes(upgrade)}
                  >
                    <View style={styles.upgradeHeader}>
                      <Text style={[styles.upgradeName, { color: colors.text.primary }]}>
                        {upgrade.name}
                      </Text>
                      <View style={[styles.costBadge, { backgroundColor: colors.primary[500] }]}>
                        <Text style={[styles.costText, { color: colors.background.card }]}>
                          {upgrade.cost} 🌰✨
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.upgradeDescription, { color: colors.text.secondary }]}>
                      {upgrade.description}
                    </Text>
                    <Text style={[styles.upgradeLevel, { color: colors.primary[500] }]}>
                      Tier {upgrade.tier}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderSkillTrees = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          🌟 Skill Trees
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>
          Permanent passive abilities and enhancements
        </Text>

        {Object.entries(skillTree.branches).map(([branchKey, branch]) => (
          <View key={branchKey} style={[styles.skillBranch, { backgroundColor: colors.background.card }]}>
            <Text style={[styles.branchTitle, { color: colors.text.primary }]}>
              {branch.name}
            </Text>
            <Text style={[styles.branchDescription, { color: colors.text.secondary }]}>
              {branch.description}
            </Text>

            {branch.nodes.map(skill => {
              const canUnlock = canUnlockSkill(selectedCharacter, skill.id, unlockedSkills);
              const isUnlocked = unlockedSkills.includes(skill.id);
              const canAfford = skill.cost <= availableVirtuAcorns;

              return (
                <TouchableOpacity
                  key={skill.id}
                  style={[
                    styles.skillCard,
                    {
                      backgroundColor: isUnlocked ? colors.primary[500] + '20' : colors.background.primary,
                      borderColor: isUnlocked ? colors.primary[500] :
                                  (canUnlock && canAfford) ? colors.secondary : colors.gray[300],
                      opacity: isUnlocked ? 0.8 : (canUnlock ? 1 : 0.5)
                    }
                  ]}
                  onPress={() => {
                    if (!isUnlocked && canUnlock && canAfford) {
                      onUnlockSkill(selectedCharacter, skill.id, skill.cost);
                    }
                  }}
                  disabled={isUnlocked || !canUnlock || !canAfford}
                >
                  <View style={styles.skillHeader}>
                    <View style={styles.skillInfo}>
                      <Text style={[styles.skillName, { color: colors.text.primary }]}>
                        {isUnlocked ? '✓ ' : ''}{skill.name}
                      </Text>
                      {skill.prerequisites && skill.prerequisites.length > 0 && (
                        <Text style={[styles.prerequisites, { color: colors.text.secondary }]}>
                          Requires: {skill.prerequisites.join(', ')}
                        </Text>
                      )}
                    </View>
                    {!isUnlocked && (
                      <View style={[styles.costBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.costText, { color: colors.background.card }]}>
                          {skill.cost} 🌰✨
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.skillDescription, { color: colors.text.secondary }]}>
                    {skill.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderMastery = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          🏆 Character Mastery
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>
          Overall progression and achievements for this character
        </Text>

        <View style={[styles.masteryCard, { backgroundColor: colors.background.card }]}>
          <Text style={[styles.masteryTitle, { color: colors.text.primary }]}>
            Mastery Level: 1
          </Text>
          <Text style={[styles.masteryDescription, { color: colors.text.secondary }]}>
            Complete battles and upgrade abilities to increase mastery
          </Text>

          <View style={styles.masteryStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Skills Unlocked
              </Text>
              <Text style={[styles.statValue, { color: colors.primary[500] }]}>
                {unlockedSkills.length}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Moves Upgraded
              </Text>
              <Text style={[styles.statValue, { color: colors.primary[500] }]}>
                {currentMoves.filter(move => !['peck', 'inspire', 'gust'].includes(move)).length}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.achievementSection, { backgroundColor: colors.background.card }]}>
          <Text style={[styles.achievementTitle, { color: colors.text.primary }]}>
            🎯 Character Achievements
          </Text>
          <Text style={[styles.comingSoon, { color: colors.text.secondary }]}>
            Achievement system coming soon...
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray[300] }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.background.card }]}
          onPress={onBack}
        >
          <Text style={[styles.backButtonText, { color: colors.text.primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        <View style={styles.characterInfo}>
          <Text style={[styles.characterName, { color: colors.text.primary }]}>
            {character.emoji} {character.name}
          </Text>
          <Text style={[styles.virtuAcorns, { color: colors.primary[500] }]}>
            🌰✨ {availableVirtuAcorns} VirtuAcorns
          </Text>
        </View>
      </View>

      {/* Character Selection */}
      <View style={[styles.characterSelector, { backgroundColor: colors.background.card, borderBottomColor: colors.gray[300] }]}>
        <Text style={[styles.selectorTitle, { color: colors.text.primary }]}>
          Select Character:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.characterList}>
          {availableCharacters.map(charId => {
            const char = CHARACTERS[charId];
            const isSelected = selectedCharacter === charId;
            return (
              <TouchableOpacity
                key={charId}
                style={[
                  styles.characterOption,
                  {
                    backgroundColor: isSelected ? colors.primary[500] : colors.background.primary,
                    borderColor: isSelected ? colors.primary[500] : colors.gray[300]
                  }
                ]}
                onPress={() => setSelectedCharacter(charId)}
              >
                <Text style={[styles.characterEmoji]}>
                  {char.emoji}
                </Text>
                <Text style={[
                  styles.characterName,
                  { color: isSelected ? colors.background.card : colors.text.primary }
                ]}>
                  {char.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabBar, { backgroundColor: colors.background.card }]}>
        {[
          { key: 'moves' as const, label: '⚔️ Moves' },
          { key: 'skills' as const, label: '🌟 Skills' },
          { key: 'mastery' as const, label: '🏆 Mastery' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === tab.key ? colors.primary[500] : 'transparent',
                borderColor: activeTab === tab.key ? colors.primary[500] : colors.gray[300]
              }
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? colors.background.card : colors.text.primary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'moves' && renderMoveUpgrades()}
        {activeTab === 'skills' && renderSkillTrees()}
        {activeTab === 'mastery' && renderMastery()}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  characterInfo: {
    flex: 1,
    alignItems: 'center',
  },
  characterName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  virtuAcorns: {
    fontSize: 16,
    fontWeight: '600',
  },
  characterSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  characterList: {
    flexDirection: 'row',
  },
  characterOption: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 8,
    minWidth: 80,
  },
  characterEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  characterName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  moveSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  moveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  maxLevelText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  upgradeCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 8,
  },
  upgradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  upgradeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  costBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  costText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  upgradeDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  upgradeLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  skillBranch: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  branchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  branchDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
  },
  skillCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 8,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  skillInfo: {
    flex: 1,
    marginRight: 8,
  },
  skillName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  prerequisites: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  skillDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  masteryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  masteryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  masteryDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  masteryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  achievementSection: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  comingSoon: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});