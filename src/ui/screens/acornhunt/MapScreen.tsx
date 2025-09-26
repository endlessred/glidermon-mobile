import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../../../data/hooks/useTheme';
import { RunState, NodeType } from '../../../game/acornhunt/types';
import { getNextNodes } from '../../../game/acornhunt/mapGenerator';
import { CHARACTERS } from '../../../game/acornhunt/characters';

interface MapScreenProps {
  run: RunState;
  onNodeSelected: (nodeId: string) => void;
  onExit: () => void;
}

export function MapScreen({ run, onNodeSelected, onExit }: MapScreenProps) {
  const { colors, typography, spacing } = useTheme();

  const currentNode = run.map[run.nodeIndex];
  const isCurrentNodeCompleted = currentNode?.completed || false;
  const nextNodes = isCurrentNodeCompleted ? getNextNodes(run.map, currentNode?.id || 'start') : [];
  const canProgress = nextNodes.length > 0;

  const getNodeEmoji = (type: NodeType): string => {
    switch (type) {
      case 'battle': return '⚔️';
      case 'treasure': return '📦';
      case 'event': return '❓';
      case 'boss': return '👹';
      default: return '🌿';
    }
  };

  const getNodeTypeColor = (type: NodeType): string => {
    switch (type) {
      case 'battle': return '#ff6b6b';
      case 'treasure': return '#ffd93d';
      case 'event': return '#74c0fc';
      case 'boss': return '#8c44ad';
      default: return colors.textSecondary;
    }
  };

  const handleNodePress = (nodeId: string) => {
    const node = run.map.find(n => n.id === nodeId);
    if (!node) return;

    // For now, directly navigate without alert to debug the issue
    console.log('Node pressed:', nodeId, node.title);
    onNodeSelected(nodeId);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onExit}>
          <Text style={[styles.exitButton, { color: colors.primary }]}>Exit</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Forest Map</Text>
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          {run.nodeIndex + 1}/{run.map.length}
        </Text>
      </View>

      {/* Run Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            🌰 {run.rewards.acorns}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Acorns</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {run.relics.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Relics</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {run.speed}×
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Speed</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Current Location */}
        {currentNode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📍 Current Location
            </Text>
            <View style={[styles.currentNodeCard, { backgroundColor: colors.surface }]}>
              <View style={styles.nodeHeader}>
                <Text style={styles.nodeEmoji}>{getNodeEmoji(currentNode.type)}</Text>
                <View style={styles.nodeInfo}>
                  <Text style={[styles.nodeTitle, { color: colors.text }]}>
                    {currentNode.title}
                  </Text>
                  <Text style={[styles.nodeType, { color: getNodeTypeColor(currentNode.type) }]}>
                    {currentNode.type.charAt(0).toUpperCase() + currentNode.type.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.nodeDescription, { color: colors.textSecondary }]}>
                {currentNode.description}
              </Text>

              {!isCurrentNodeCompleted && (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 12,
                    alignItems: 'center'
                  }}
                  onPress={() => handleNodePress(currentNode.id)}
                >
                  <Text style={{ color: colors.background, fontWeight: 'bold', fontSize: 16 }}>
                    {currentNode.type === 'battle' && '⚔️ Fight!'}
                    {currentNode.type === 'treasure' && '📦 Open Treasure!'}
                    {currentNode.type === 'event' && '❓ Investigate!'}
                    {currentNode.type === 'boss' && '👹 Face the Boss!'}
                  </Text>
                </TouchableOpacity>
              )}

              {isCurrentNodeCompleted && (
                <View style={{
                  backgroundColor: colors.surface,
                  padding: 8,
                  borderRadius: 6,
                  marginTop: 8,
                  alignItems: 'center'
                }}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                    ✅ Completed
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Next Destinations */}
        {canProgress && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🗺️ Choose Your Path
            </Text>

            {/* Debug button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#ff0000',
                padding: 20,
                marginBottom: 10,
                borderRadius: 8
              }}
              onPress={() => {
                console.log('DEBUG: Test button pressed!');
                onNodeSelected(nextNodes[0]?.id || 'test');
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                DEBUG: Tap to Test Navigation
              </Text>
            </TouchableOpacity>

            {nextNodes.map(node => (
              <TouchableOpacity
                key={node.id}
                style={[
                  styles.nodeCard,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 2,
                    borderColor: '#ff0000' // Debug red border to see if TouchableOpacity is visible
                  }
                ]}

                onPress={() => {
                  console.log('TouchableOpacity pressed for node:', node.id);
                  handleNodePress(node.id);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.nodeHeader}>
                  <Text style={styles.nodeEmoji}>{getNodeEmoji(node.type)}</Text>
                  <View style={styles.nodeInfo}>
                    <Text style={[styles.nodeTitle, { color: colors.text }]}>
                      {node.title}
                    </Text>
                    <Text style={[styles.nodeType, { color: getNodeTypeColor(node.type) }]}>
                      {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
                    </Text>
                  </View>
                  <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
                    Tap to enter →
                  </Text>
                </View>
                <Text style={[styles.nodeDescription, { color: colors.textSecondary }]}>
                  {node.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Party Status */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            👥 Your Party
          </Text>
          <View style={[styles.partyContainer, { backgroundColor: colors.surface }]}>
            {run.party.map(characterId => {
              const character = CHARACTERS[characterId];
              const hpData = run.partyHP?.[characterId];
              const hpPercent = hpData ? (hpData.current / hpData.max) : 1;

              // Color code HP bar based on health percentage
              const getHealthColor = (percent: number) => {
                if (percent > 0.6) return '#4ade80';  // Green
                if (percent > 0.3) return '#facc15';  // Yellow
                if (percent > 0) return '#ef4444';   // Red
                return '#6b7280';  // Gray (dead)
              };

              if (!character) return null;

              return (
                <View key={characterId} style={styles.partyMember}>
                  <Text style={styles.partyEmoji}>{character.emoji}</Text>
                  <Text style={[styles.partyName, { color: colors.text }]}>
                    {character.name}
                  </Text>
                  <View style={[styles.healthBar, { backgroundColor: colors.border }]}>
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
                  {hpData && (
                    <Text style={[styles.hpText, { color: colors.textSecondary }]}>
                      {hpData.current}/{hpData.max}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Collected Relics */}
        {run.relics.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ✨ Collected Relics
            </Text>
            <View style={[styles.relicsContainer, { backgroundColor: colors.surface }]}>
              {run.relics.map((relicId, index) => (
                <View key={index} style={styles.relicItem}>
                  <Text style={styles.relicEmoji}>⚡</Text>
                  <Text style={[styles.relicName, { color: colors.text }]}>
                    {relicId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Map Progress */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🛤️ Journey Progress
          </Text>
          <View style={styles.mapProgress}>
            {run.map.map((node, index) => (
              <View key={node.id} style={styles.progressNode}>
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: index <= run.nodeIndex ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={styles.progressEmoji}>
                    {getNodeEmoji(node.type)}
                  </Text>
                </View>
                {index < run.map.length - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      {
                        backgroundColor: index < run.nodeIndex ? colors.primary : colors.border,
                      }
                    ]}
                  />
                )}
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
  exitButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progress: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  currentNodeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  nodeCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  nodeInfo: {
    flex: 1,
  },
  nodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  nodeType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  nodeDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  tapHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  partyContainer: {
    padding: 16,
    borderRadius: 12,
  },
  partyMember: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  partyEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  healthBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 3,
  },
  hpText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  relicsContainer: {
    padding: 16,
    borderRadius: 12,
  },
  relicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  relicEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  relicName: {
    fontSize: 14,
    fontWeight: '500',
  },
  mapProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  progressNode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressEmoji: {
    fontSize: 16,
  },
  progressLine: {
    width: 20,
    height: 2,
  },
});