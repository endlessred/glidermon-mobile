import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../../../data/hooks/useTheme';
import { CharacterId, CharacterDef } from '../../../game/acornhunt/types';
import { CHARACTERS, getAvailablePartyMembers } from '../../../game/acornhunt/characters';
import { CHARACTER_DESCRIPTIONS, getRoleEmoji, getRoleColor } from '../../../game/acornhunt/characterDescriptions';

interface PartySelectScreenProps {
  onPartySelected: (party: CharacterId[]) => void;
  onBack: () => void;
  onProgression?: () => void;
}

export function PartySelectScreen({ onPartySelected, onBack, onProgression }: PartySelectScreenProps) {
  const { colors, typography, spacing } = useTheme();
  const [selectedParty, setSelectedParty] = useState<CharacterId[]>([]);

  const availableCharacters = getAvailablePartyMembers();
  const playerCharacter = CHARACTERS.player;

  const toggleCharacterSelection = (characterId: CharacterId) => {
    setSelectedParty(prev => {
      if (prev.includes(characterId)) {
        // Remove from party
        return prev.filter(id => id !== characterId);
      } else if (prev.length < 2) {
        // Add to party (max 2 NPCs + player = 3 total)
        return [...prev, characterId];
      } else {
        Alert.alert('Party Full', 'You can only select 2 companions to join your party.');
        return prev;
      }
    });
  };

  const canStartAdventure = selectedParty.length === 2;

  const startAdventure = () => {
    if (canStartAdventure) {
      onPartySelected(selectedParty);
    }
  };

  const renderCharacterCard = (character: CharacterDef, isPlayer: boolean = false) => {
    const isSelected = selectedParty.includes(character.id);
    const isSelectable = !isPlayer && (isSelected || selectedParty.length < 2);
    const description = CHARACTER_DESCRIPTIONS[character.id];
    const roleEmoji = getRoleEmoji(character.id);
    const roleColor = getRoleColor(character.id);

    return (
      <TouchableOpacity
        key={character.id}
        style={[
          styles.characterCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
            opacity: isPlayer ? 1 : (isSelectable ? 1 : 0.5)
          }
        ]}
        onPress={() => !isPlayer && isSelectable && toggleCharacterSelection(character.id)}
        disabled={isPlayer || !isSelectable}
      >
        <View style={styles.characterHeader}>
          <Text style={styles.characterEmoji}>{character.emoji}</Text>
          <View style={styles.characterInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.characterName, { color: colors.text }]}>
                {character.name}
                {isPlayer && ' (You)'}
              </Text>
              <View style={[styles.roleIndicator, { backgroundColor: roleColor }]}>
                <Text style={styles.roleEmoji}>{roleEmoji}</Text>
              </View>
            </View>
            <Text style={[styles.characterRole, { color: colors.textSecondary }]}>
              {description.role}
            </Text>
            {isSelected && !isPlayer && (
              <Text style={[styles.selectedLabel, { color: colors.primary }]}>
                ✓ Selected
              </Text>
            )}
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={[styles.playstyleText, { color: colors.text }]}>
            {description.playstyle}
          </Text>
          <View style={styles.strengthsContainer}>
            {description.strengths.slice(0, 3).map((strength, index) => (
              <View key={index} style={[styles.strengthBadge, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.strengthText, { color: roleColor }]}>
                  {strength}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatDisplay label="STR" value={character.base.STR} colors={colors} />
            <StatDisplay label="SPD" value={character.base.SPD} colors={colors} />
            <StatDisplay label="MAG" value={character.base.MAG} colors={colors} />
          </View>
          <View style={styles.statsRow}>
            <StatDisplay label="DEF" value={character.base.DEF} colors={colors} />
            <StatDisplay label="LCK" value={character.base.LCK} colors={colors} />
            <StatDisplay label="HP" value={character.base.HP} colors={colors} />
          </View>
        </View>

        <View style={styles.movesContainer}>
          <Text style={[styles.movesLabel, { color: colors.textSecondary }]}>
            Key Abilities:
          </Text>
          <Text style={[styles.movesList, { color: colors.textSecondary }]}>
            {description.keyMoves.slice(0, 2).join(' • ')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Choose Your Party</Text>
        {onProgression && (
          <TouchableOpacity onPress={onProgression} style={styles.progressionButton}>
            <Text style={[styles.progressionButtonText, { color: colors.primary }]}>
              🌟 Upgrades
            </Text>
          </TouchableOpacity>
        )}
        {!onProgression && <View style={{ width: 50 }} />}
      </View>

      <ScrollView style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={[styles.instructionsTitle, { color: colors.text }]}>
            🌰 Welcome to Acorn Hunt! 🌰
          </Text>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            Choose 2 companions to join your adventure through the enchanted forest.
            Each character has unique abilities and stats that will help in battle.
          </Text>
        </View>

        {/* Player Character (Always in party) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Character</Text>
          {renderCharacterCard(playerCharacter, true)}
        </View>

        {/* Available Companions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Choose 2 Companions ({selectedParty.length}/2)
          </Text>
          {availableCharacters.map(character => renderCharacterCard(character))}
        </View>

        {/* Party Preview */}
        {selectedParty.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Party</Text>
            <View style={[styles.partyPreview, { backgroundColor: colors.surface }]}>
              <Text style={styles.partyMember}>
                {playerCharacter.emoji} {playerCharacter.name}
              </Text>
              {selectedParty.map(characterId => {
                const character = CHARACTERS[characterId];
                return (
                  <Text key={characterId} style={styles.partyMember}>
                    {character.emoji} {character.name}
                  </Text>
                );
              })}
              {selectedParty.length < 2 && (
                <Text style={[styles.emptySlot, { color: colors.textSecondary }]}>
                  + Choose {2 - selectedParty.length} more
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start Adventure Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.startButton,
            {
              backgroundColor: canStartAdventure ? colors.primary : colors.surface,
              opacity: canStartAdventure ? 1 : 0.5
            }
          ]}
          onPress={startAdventure}
          disabled={!canStartAdventure}
        >
          <Text style={[
            styles.startButtonText,
            { color: canStartAdventure ? colors.background : colors.textSecondary }
          ]}>
            {canStartAdventure ? '🚀 Start Adventure!' : 'Select 2 Companions'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatDisplay({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
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
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instructionsContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsText: {
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
  characterCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  characterEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  characterInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  characterName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  roleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  roleEmoji: {
    fontSize: 14,
  },
  characterRole: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  playstyleText: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  strengthsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  strengthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  strengthText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  movesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  movesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  movesList: {
    fontSize: 12,
    lineHeight: 16,
  },
  partyPreview: {
    padding: 16,
    borderRadius: 12,
  },
  partyMember: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySlot: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});