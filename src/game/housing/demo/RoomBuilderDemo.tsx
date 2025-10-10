import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRoomBuilder } from '../hooks/useRoomBuilder';
import { Skeleton } from '@esotericsoftware/spine-core';
import { RoomLayoutConfig } from '../types/RoomConfig';
import { createCustomRoom } from '../templates/roomTemplates';

interface RoomBuilderDemoProps {
  skeleton: Skeleton | null;
}

export function RoomBuilderDemo({ skeleton }: RoomBuilderDemoProps) {
  const {
    currentRoom,
    availableTemplates,
    applyRoomTemplate,
    applyRoomConfig,
    isApplying,
    error
  } = useRoomBuilder(skeleton);

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleApplyTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId);
    const success = await applyRoomTemplate(templateId);
    if (success) {
      console.log(`Applied template: ${templateId}`);
    }
  };

  const handleCreateCustomRoom = async () => {
    const customRoom = createCustomRoom(
      'Custom Demo Room',
      { width: 6, height: 6 },
      'YellowWoodFloor',
      'DarkBrickWall'
    );

    const success = await applyRoomConfig(customRoom);
    if (success) {
      console.log('Applied custom room configuration');
    }
  };

  const handleMixedMaterialDemo = async () => {
    const mixedRoom: RoomLayoutConfig = {
      name: 'Mixed Material Demo',
      dimensions: { width: 5, height: 5 },
      defaultFloor: {
        set: 'GreyBlankFloor',
        variant: 'Sides2'
      },
      defaultWall: {
        set: 'GreyBlankWall',
        variant: 'Sides1'
      },
      floors: [
        // Create a cross pattern with different materials
        { tileId: 'C3', floor: { set: 'RedCarpet', variant: 'Sides2' } },
        { tileId: 'B3', floor: { set: 'BlueCarpet', variant: 'Sides2' } },
        { tileId: 'D3', floor: { set: 'BlueCarpet', variant: 'Sides2' } },
        { tileId: 'C2', floor: { set: 'BlueCarpet', variant: 'Sides2' } },
        { tileId: 'C4', floor: { set: 'BlueCarpet', variant: 'Sides2' } },
      ],
      walls: [],
      furniture: []
    };

    const success = await applyRoomConfig(mixedRoom);
    if (success) {
      console.log('Applied mixed material demo');
    }
  };

  if (!skeleton) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading room skeleton...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room Builder Demo</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {currentRoom && (
        <View style={styles.currentRoomContainer}>
          <Text style={styles.currentRoomTitle}>Current Room: {currentRoom.name}</Text>
          <Text style={styles.currentRoomDetails}>
            Size: {currentRoom.dimensions.width}×{currentRoom.dimensions.height}
          </Text>
          {currentRoom.defaultFloor && (
            <Text style={styles.currentRoomDetails}>
              Floor: {currentRoom.defaultFloor.set}
            </Text>
          )}
          {currentRoom.defaultWall && (
            <Text style={styles.currentRoomDetails}>
              Walls: {currentRoom.defaultWall.set}
            </Text>
          )}
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>Pre-built Templates</Text>
        {availableTemplates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.templateButton,
              selectedTemplate === template.id && styles.selectedTemplate,
              isApplying && styles.disabledButton
            ]}
            onPress={() => handleApplyTemplate(template.id)}
            disabled={isApplying}
          >
            <Text style={styles.templateButtonText}>{template.name}</Text>
            <Text style={styles.templateDescription}>{template.description}</Text>
            <Text style={styles.templateDetails}>
              {template.layout.dimensions.width}×{template.layout.dimensions.height}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Custom Configurations</Text>

        <TouchableOpacity
          style={[styles.customButton, isApplying && styles.disabledButton]}
          onPress={handleCreateCustomRoom}
          disabled={isApplying}
        >
          <Text style={styles.customButtonText}>Create Custom Room</Text>
          <Text style={styles.customDescription}>
            6×6 room with yellow wood floors and dark brick walls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.customButton, isApplying && styles.disabledButton]}
          onPress={handleMixedMaterialDemo}
          disabled={isApplying}
        >
          <Text style={styles.customButtonText}>Mixed Materials Demo</Text>
          <Text style={styles.customDescription}>
            5×5 room with different floor materials in a cross pattern
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {isApplying && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Applying room configuration...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  currentRoomContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  currentRoomTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  currentRoomDetails: {
    fontSize: 14,
    color: '#388e3c',
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    color: '#333',
  },
  templateButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedTemplate: {
    borderColor: '#2196f3',
    backgroundColor: '#e3f2fd',
  },
  disabledButton: {
    opacity: 0.6,
  },
  templateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  templateDetails: {
    fontSize: 12,
    color: '#999',
  },
  customButton: {
    backgroundColor: '#ff9800',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  customDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});