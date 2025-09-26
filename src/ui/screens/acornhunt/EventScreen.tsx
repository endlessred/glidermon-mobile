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
import { RunState, EventDef, EventChoice } from '../../../game/acornhunt/types';
import { SeededRNG } from '../../../game/acornhunt/rng';

interface EventScreenProps {
  run: RunState;
  onEventComplete: (updatedRun: RunState) => void;
}

// Sample events (would normally be in a separate file)
const EVENTS: EventDef[] = [
  {
    id: 'wounded_animal',
    title: 'Wounded Animal',
    description: 'You encounter a wounded fox caught in a trap. It whimpers pitifully, looking at you with pleading eyes.',
    choices: [
      {
        text: '🩹 Help free the fox',
        description: 'Cost: 10 🌰 | Reward: +15 🌰, +1 LCK | (If poor: +1 LCK only)',
        effect: (run) => {
          if (run.rewards.acorns >= 10) {
            run.rewards.acorns -= 10;
            return {
              message: 'The fox nods gratefully and disappears into the forest. You feel a warm glow of compassion.',
              acorns: 15,
              statChange: { LCK: 1 }
            };
          } else {
            return {
              message: 'You don\'t have enough acorns for proper medical supplies, but you do your best with what you have.',
              statChange: { LCK: 1 }
            };
          }
        }
      },
      {
        text: '🏃 Leave quickly',
        description: 'Reward: +5 🌰 | No stat changes',
        effect: (run) => ({
          message: 'You hurry away, trying not to think about the fox\'s sad eyes. Sometimes survival comes first.',
          acorns: 5
        })
      },
      {
        text: '🔍 Search the area carefully',
        description: 'Reward: +25 🌰 | No stat changes',
        effect: (run) => ({
          message: 'While investigating, you find the trap was set by poachers. You disable several more traps and find their hidden stash!',
          acorns: 25
        })
      }
    ]
  },
  {
    id: 'mysterious_shrine',
    title: 'Ancient Shrine',
    description: 'A moss-covered shrine glows softly in a clearing. Ancient runes pulse with magical energy. You can feel power emanating from it.',
    choices: [
      {
        text: '🙏 Offer acorns to the shrine',
        description: 'Cost: 15 🌰 | Reward: +2 MAG, +1 LCK | (If poor: +1 MAG only)',
        effect: (run) => {
          if (run.rewards.acorns >= 15) {
            run.rewards.acorns -= 15;
            return {
              message: 'The shrine accepts your offering with a warm light. You feel blessed with ancient wisdom.',
              statChange: { MAG: 2, LCK: 1 }
            };
          } else {
            return {
              message: 'The shrine senses your good intentions despite your lack of offerings.',
              statChange: { MAG: 1 }
            };
          }
        }
      },
      {
        text: '📚 Study the runes carefully',
        description: 'Stat Change: +1 MAG, -1 SPD | Slow but steady learning',
        effect: (run) => ({
          message: 'Your careful study reveals ancient knowledge. You gain insight into magical arts.',
          statChange: { MAG: 1, SPD: -1 }
        })
      },
      {
        text: '👋 Touch the shrine with your bare hand',
        description: 'Random: 50% chance +2 STR, +2 MAG | 50% chance -1 STR, +1 MAG, +1 LCK',
        effect: (run) => {
          const rng = new SeededRNG(run.seed + run.nodeIndex + 500);
          if (rng.next() < 0.5) {
            return {
              message: 'The shrine\'s magic surges through you! You feel incredibly empowered.',
              statChange: { STR: 2, MAG: 2 }
            };
          } else {
            return {
              message: 'The shrine\'s magic is too much! You feel drained but wiser.',
              statChange: { STR: -1, MAG: 1, LCK: 1 }
            };
          }
        }
      }
    ]
  },
  {
    id: 'talking_flowers',
    title: 'Chattering Flowers',
    description: 'A patch of colorful flowers seems to be gossiping among themselves. As you approach, they turn to you excitedly.',
    choices: [
      {
        text: '🌸 "What news do you have?"',
        description: 'Reward: +12 🌰 | Learn about the path ahead',
        effect: (run) => ({
          message: '"Oh my, a visitor!" they chatter. "The path ahead has treasures, but beware the sleeping giant!" They give you directions to a secret cache.',
          acorns: 12
        })
      },
      {
        text: '💃 Dance with the flowers',
        description: 'Stat Change: +2 SPD | Joy makes you feel lighter!',
        effect: (run) => ({
          message: 'The flowers giggle with delight at your silly dance. Their joy is infectious, and you feel lighter on your feet!',
          statChange: { SPD: 2 }
        })
      },
      {
        text: '🤫 Listen quietly to their gossip',
        description: 'Stat Change: +2 LCK | Gain valuable forest secrets',
        effect: (run) => ({
          message: 'You overhear valuable information about the forest\'s secrets and hidden dangers. Knowledge is power!',
          statChange: { LCK: 2 }
        })
      }
    ]
  },
  {
    id: 'glowing_pool',
    title: 'Mystical Pool',
    description: 'A crystal-clear pool reflects not the sky, but swirling galaxies. The water seems to whisper secrets of the universe.',
    choices: [
      {
        text: '🥤 Drink from the pool',
        description: 'Random: 70% chance +3 MAG | 30% chance +1 MAG, -1 DEF',
        effect: (run) => {
          const rng = new SeededRNG(run.seed + run.nodeIndex + 600);
          if (rng.next() < 0.7) {
            return {
              message: 'The cosmic water fills you with starlight! You feel connected to the universe\'s magic.',
              statChange: { MAG: 3 }
            };
          } else {
            return {
              message: 'The water is too powerful! You feel overwhelmed but gain some mystical insight.',
              statChange: { MAG: 1, DEF: -1 }
            };
          }
        }
      },
      {
        text: '🪞 Gaze into the reflection',
        description: 'Stat Change: +1 DEF, +1 LCK | See glimpses of the future',
        effect: (run) => ({
          message: 'In the cosmic reflection, you see glimpses of possible futures. This knowledge makes you more prepared for what\'s ahead.',
          statChange: { DEF: 1, LCK: 1 }
        })
      },
      {
        text: '💰 Toss acorns into the pool as an offering',
        description: 'Cost: Up to 8 🌰 | Return: 2x acorns back + 2 LCK',
        effect: (run) => {
          const offering = Math.min(8, run.rewards.acorns);
          run.rewards.acorns -= offering;
          return {
            message: `The pool accepts your offering of ${offering} acorns and grants you its blessing. The cosmic energy makes you feel incredibly fortunate!`,
            acorns: offering * 2,
            statChange: { LCK: 2 }
          };
        }
      }
    ]
  }
];

export function EventScreen({ run, onEventComplete }: EventScreenProps) {
  const { colors, typography, spacing } = useTheme();
  const [currentEvent, setCurrentEvent] = useState<EventDef | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<EventChoice | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Select random event based on run seed
    const rng = new SeededRNG(run.seed + run.nodeIndex + 200);
    const eventIndex = Math.floor(rng.next() * EVENTS.length);
    setCurrentEvent(EVENTS[eventIndex]);
  }, [run.seed, run.nodeIndex]);

  const handleChoiceSelect = async (choice: EventChoice) => {
    if (!currentEvent || isProcessing) return;

    setIsProcessing(true);
    setSelectedChoice(choice);

    try {
      // Apply choice effect
      const updatedRun = { ...run };
      const result = choice.effect(updatedRun);

      // Apply rewards
      if (result.acorns) {
        updatedRun.rewards.acorns += result.acorns;
        // Events also grant a small amount of VirtuAcorns
        updatedRun.rewards.virtuAcorns += Math.floor(result.acorns * 0.3);
      }

      // Apply stat changes (would normally affect party members)
      if (result.statChange) {
        // For now, just show in the outcome message
      }

      setOutcome(result.message);

      // Auto-continue after showing outcome
      setTimeout(() => {
        onEventComplete(updatedRun);
      }, 3000);

    } catch (error) {
      console.error('Event error:', error);
      Alert.alert('Event Error', 'Something went wrong processing the event.');
      setIsProcessing(false);
    }
  };

  if (!currentEvent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Something stirs in the forest...
          </Text>
        </View>
      </View>
    );
  }

  if (outcome) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.outcomeContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.outcomeTitle, { color: colors.text }]}>
            ✨ Outcome ✨
          </Text>
          <Text style={[styles.outcomeText, { color: colors.textSecondary }]}>
            {outcome}
          </Text>
          <Text style={[styles.continueText, { color: colors.textSecondary }]}>
            Continuing automatically...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          ❓ Random Event
        </Text>
        <Text style={[styles.nodeInfo, { color: colors.textSecondary }]}>
          Node {run.nodeIndex + 1}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Event Story */}
        <View style={[styles.eventContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>
            {currentEvent.title}
          </Text>
          <View style={styles.divider} />
          <Text style={[styles.eventDescription, { color: colors.textSecondary }]}>
            {currentEvent.description}
          </Text>
        </View>

        {/* Run Status */}
        <View style={[styles.statusContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            📊 Current Status
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: colors.primary }]}>
                🌰 {run.rewards.acorns}
              </Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                Acorns
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: colors.text }]}>
                ✨ {run.relics.length}
              </Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                Relics
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: colors.text }]}>
                👥 {run.party.length}
              </Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                Party
              </Text>
            </View>
          </View>
        </View>

        {/* Choices */}
        <View style={styles.choicesSection}>
          <Text style={[styles.choicesTitle, { color: colors.text }]}>
            🤔 What do you do?
          </Text>

          {currentEvent.choices.map((choice, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.choiceCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: isProcessing ? 0.5 : 1
                }
              ]}
              onPress={() => handleChoiceSelect(choice)}
              disabled={isProcessing}
            >
              <View style={styles.choiceContent}>
                <Text style={[styles.choiceText, { color: colors.text }]}>
                  {choice.text}
                </Text>
                {choice.description && (
                  <Text style={[styles.choiceDescription, { color: colors.textSecondary }]}>
                    {choice.description}
                  </Text>
                )}
                <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
                  Tap to choose →
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Event Tips */}
        <View style={[styles.tipsContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>
            💡 Choice Effects Guide
          </Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            • 🌰 = Acorns gained or spent
          </Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            • STR/SPD/MAG/DEF/LCK = Permanent stat changes
          </Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            • "Random" = Chance-based outcomes with probabilities shown
          </Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            • "Cost" = Requirements that must be met to get full benefits
          </Text>
        </View>
      </ScrollView>

      {isProcessing && (
        <View style={[styles.processingOverlay, { backgroundColor: colors.background + '80' }]}>
          <Text style={[styles.processingText, { color: colors.text }]}>
            Processing your choice...
          </Text>
        </View>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  nodeInfo: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  eventContainer: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  eventDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
  },
  choicesSection: {
    marginBottom: 16,
  },
  choicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  choiceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  choiceContent: {
    flex: 1,
  },
  choiceText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  choiceDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tapHint: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  tipsContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 18,
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
  outcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    margin: 16,
    borderRadius: 12,
  },
  outcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  outcomeText: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  continueText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});