import { useState, useCallback, useRef } from 'react';
import { Skeleton } from '@esotericsoftware/spine-core';
import { RoomBuilder } from '../builders/RoomBuilder';
import { RoomLayoutConfig, RoomTemplate } from '../types/RoomConfig';
import { ROOM_TEMPLATES, getRoomTemplate } from '../templates/roomTemplates';

export interface UseRoomBuilderReturn {
  currentRoom: RoomLayoutConfig | null;
  availableTemplates: RoomTemplate[];
  applyRoomTemplate: (templateId: string) => Promise<boolean>;
  applyRoomConfig: (config: RoomLayoutConfig) => Promise<boolean>;
  isApplying: boolean;
  error: string | null;
}

export function useRoomBuilder(skeleton: Skeleton | null): UseRoomBuilderReturn {
  const [currentRoom, setCurrentRoom] = useState<RoomLayoutConfig | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomBuilderRef = useRef<RoomBuilder | null>(null);

  // Initialize RoomBuilder when skeleton is available
  if (skeleton && !roomBuilderRef.current) {
    roomBuilderRef.current = new RoomBuilder(skeleton);
  }

  const applyRoomConfig = useCallback(async (config: RoomLayoutConfig): Promise<boolean> => {
    if (!roomBuilderRef.current) {
      setError('Room builder not initialized - skeleton not loaded');
      return false;
    }

    setIsApplying(true);
    setError(null);

    try {
      // Validate the configuration
      if (!RoomBuilder.validateRoomConfig(config)) {
        throw new Error('Invalid room configuration');
      }

      // Apply the room layout
      roomBuilderRef.current.applyRoomLayout(config);
      setCurrentRoom(config);

      if (__DEV__) {
        console.log('useRoomBuilder: Successfully applied room configuration', config.name);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply room configuration';
      setError(errorMessage);
      console.error('useRoomBuilder: Error applying room configuration', err);
      return false;
    } finally {
      setIsApplying(false);
    }
  }, []);

  const applyRoomTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    const template = getRoomTemplate(templateId);
    if (!template) {
      setError(`Room template not found: ${templateId}`);
      return false;
    }

    return applyRoomConfig(template.layout);
  }, [applyRoomConfig]);

  return {
    currentRoom,
    availableTemplates: ROOM_TEMPLATES,
    applyRoomTemplate,
    applyRoomConfig,
    isApplying,
    error
  };
}