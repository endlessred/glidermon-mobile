import { useState, useEffect, useCallback } from "react";
import { AmbientConversation, ConversationData } from "../types/conversation";
import { conversationData } from "../conversations/ambientConversations";

interface UseAmbientConversationsProps {
  context: string; // e.g., "ShadedShop"
  enabled?: boolean;
  minInterval?: number; // Minimum time between conversations (ms)
  maxInterval?: number; // Maximum time between conversations (ms)
}

export function useAmbientConversations({
  context,
  enabled = true,
  minInterval = 30000, // 30 seconds
  maxInterval = 120000, // 2 minutes
}: UseAmbientConversationsProps) {
  const [currentConversation, setCurrentConversation] = useState<AmbientConversation | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lastConversationTime, setLastConversationTime] = useState(0);

  // Filter conversations by context
  const availableConversations = conversationData.conversations.filter(
    conv => conv.context === context
  );

  // Get a random conversation, avoiding the last one if possible
  const getRandomConversation = useCallback(() => {
    if (availableConversations.length === 0) return null;

    // If we have more than one conversation, try to avoid repeating the last one
    let filteredConversations = availableConversations;
    if (availableConversations.length > 1 && currentConversation) {
      filteredConversations = availableConversations.filter(
        conv => conv.id !== currentConversation.id
      );
    }

    const randomIndex = Math.floor(Math.random() * filteredConversations.length);
    return filteredConversations[randomIndex];
  }, [availableConversations, currentConversation]);

  // Calculate next conversation timing
  const getNextConversationDelay = useCallback(() => {
    return minInterval + Math.random() * (maxInterval - minInterval);
  }, [minInterval, maxInterval]);

  // Start a new conversation
  const startConversation = useCallback(() => {
    if (!enabled || isVisible) return;

    const now = Date.now();
    if (now - lastConversationTime < minInterval) return;

    const conversation = getRandomConversation();
    if (!conversation) return;

    setCurrentConversation(conversation);
    setIsVisible(true);
    setLastConversationTime(now);
  }, [enabled, isVisible, lastConversationTime, minInterval, getRandomConversation]);

  // End current conversation
  const endConversation = useCallback(() => {
    setIsVisible(false);
    // Small delay before clearing conversation to allow exit animation
    setTimeout(() => {
      setCurrentConversation(null);
    }, 300);
  }, []);

  // Schedule next conversation
  const scheduleNextConversation = useCallback(() => {
    if (!enabled) return;

    const delay = getNextConversationDelay();
    const timeoutId = setTimeout(() => {
      startConversation();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [enabled, getNextConversationDelay, startConversation]);

  // Auto-scheduling effect
  useEffect(() => {
    if (!enabled || isVisible) return;

    const cleanup = scheduleNextConversation();
    return cleanup;
  }, [enabled, isVisible, scheduleNextConversation]);

  // Manual trigger function
  const triggerConversation = useCallback(() => {
    startConversation();
  }, [startConversation]);

  // Reset function
  const reset = useCallback(() => {
    setCurrentConversation(null);
    setIsVisible(false);
    setLastConversationTime(0);
  }, []);

  return {
    currentConversation,
    isVisible,
    endConversation,
    triggerConversation,
    reset,
    availableConversations,
  };
}