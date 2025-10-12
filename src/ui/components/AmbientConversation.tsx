import React, { useState, useEffect, useRef } from "react";
import { View, Text, Animated, Easing, TouchableOpacity } from "react-native";
import { AmbientConversation, ConversationLine, CharacterName } from "../../data/types/conversation";
import { useTheme } from "../../data/hooks/useTheme";
import CharacterPortrait from "./CharacterPortrait";

interface AmbientConversationProps {
  conversation: AmbientConversation;
  onComplete: () => void;
  visible: boolean;
}

export default function AmbientConversationDisplay({
  conversation,
  onComplete,
  visible
}: AmbientConversationProps) {
  const { reduceMotion } = useTheme();
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [portraitsReady, setPortraitsReady] = useState(false);
  const [loadedPortraits, setLoadedPortraits] = useState(new Set<string>());

  // Portrait positioning (final values)
  const lumaX = -60;
  const lumaY = 0;
  const sableX = -100;
  const sableY = 0;
  const portraitScale = 1.8;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentLine = conversation.lines[currentLineIndex];
  const isLastLine = currentLineIndex >= conversation.lines.length - 1;

  // Handle portrait loading completion
  const handlePortraitLoaded = (character: string) => {
    if (__DEV__) console.log(`[Portrait] ${character} loaded`);
    setLoadedPortraits(prev => {
      const newSet = new Set(prev);
      newSet.add(character);
      return newSet;
    });
  };

  // Check if all portraits are loaded
  useEffect(() => {
    const allLoaded = loadedPortraits.has("Luma") && loadedPortraits.has("Sable");
    if (__DEV__) console.log(`[Portrait] Loading status - Luma: ${loadedPortraits.has("Luma")}, Sable: ${loadedPortraits.has("Sable")}, Ready: ${portraitsReady}`);

    if (allLoaded && !portraitsReady) {
      if (__DEV__) console.log(`[Portrait] All portraits loaded, setting ready in 100ms`);
      // Small delay to ensure all rendering is complete
      setTimeout(() => {
        setPortraitsReady(true);
        if (__DEV__) console.log(`[Portrait] Portraits now ready!`);
      }, 100);
    }
  }, [loadedPortraits, portraitsReady]);

  // Fallback timeout in case portrait loading detection fails
  useEffect(() => {
    if (visible && !portraitsReady) {
      const fallbackTimeout = setTimeout(() => {
        if (__DEV__) console.warn(`[Portrait] Fallback timeout triggered - forcing portraits ready`);
        setPortraitsReady(true);
      }, 3000); // 3 second fallback

      return () => clearTimeout(fallbackTimeout);
    }
  }, [visible, portraitsReady]);

  // Typewriter effect for dialog text (adapted from CutsceneDisplay)
  const startTyping = (text: string) => {
    if (!text) return;

    setDisplayedText("");
    setIsTyping(true);

    if (reduceMotion) {
      // Skip typewriter effect when reduce motion is enabled
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    const words = text.split(" ").filter(word => word.length > 0);
    let currentWordIndex = 0;

    const typeNextWord = () => {
      if (currentWordIndex < words.length) {
        const word = words[currentWordIndex];
        if (word !== undefined && word.length > 0) {
          setDisplayedText(prev => {
            const newText = prev + (prev.length > 0 ? " " : "") + word;
            return newText;
          });
        }
        currentWordIndex++;
        typingTimeoutRef.current = setTimeout(typeNextWord, 80); // Same speed as CutsceneDisplay
      } else {
        setIsTyping(false);
      }
    };

    typeNextWord();
  };

  // Handle line progression with timing
  useEffect(() => {
    if (__DEV__) console.log(`[Line] Progression check - visible: ${visible}, hasLine: ${!!currentLine}, portraitsReady: ${portraitsReady}`);

    if (!visible || !currentLine || !portraitsReady) {
      if (__DEV__) console.log(`[Line] Not ready to start typing yet`);
      return;
    }

    if (__DEV__) console.log(`[Line] Starting typing for: "${currentLine.text}"`);

    // Clear any existing typing timeout first
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Start typing the current line
    startTyping(currentLine.text);

    // Set timeout for this line's duration
    lineTimeoutRef.current = setTimeout(() => {
      if (isLastLine) {
        onComplete();
      } else {
        setCurrentLineIndex(prev => prev + 1);
      }
    }, currentLine.duration);

    return () => {
      // Clear both timeouts on cleanup
      if (lineTimeoutRef.current) {
        clearTimeout(lineTimeoutRef.current);
        lineTimeoutRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [currentLineIndex, visible, currentLine, isLastLine, onComplete, portraitsReady]);

  // Handle visibility animations
  useEffect(() => {
    if (visible) {
      // Reset state for new conversation
      setCurrentLineIndex(0);
      setDisplayedText("");
      setIsTyping(false);
      setPortraitsReady(false);
      setLoadedPortraits(new Set());

      if (reduceMotion) {
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
      } else {
        // Slide up and fade in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.back(1.1)),
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      if (reduceMotion) {
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
      } else {
        // Slide down and fade out
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 50,
            duration: 300,
            easing: Easing.in(Easing.back(1.1)),
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible, reduceMotion]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (lineTimeoutRef.current) {
        clearTimeout(lineTimeoutRef.current);
      }
    };
  }, []);

  if (!visible || !currentLine) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 10, // Move closer to bottom edge
        left: 20,
        right: 20,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {/* Character Portraits Row - Simplified Visual Novel Style */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 5, // Small gap above text box
          paddingHorizontal: 20, // Some padding to keep them on screen
          height: 300, // Fixed height for large portraits
        }}
      >
        <View
          style={{
            transform: [
              { translateX: lumaX },
              { translateY: lumaY },
              { scale: portraitScale },
            ],
            opacity: currentLine.character === "Luma" ? 1.0 : 0.6, // Semi-transparent when not speaking
          }}
        >
          <CharacterPortrait
            character="Luma"
            emotion={currentLine.character === "Luma" ? currentLine.emotion : "Neutral"}
            isActive={currentLine.character === "Luma"}
            size={250} // Large portraits
            hideLabels={true}
            simple={true} // No animations or containers
            onLoaded={() => handlePortraitLoaded("Luma")}
          />
        </View>
        <View
          style={{
            transform: [
              { translateX: sableX },
              { translateY: sableY },
              { scale: portraitScale },
            ],
            opacity: currentLine.character === "Sable" ? 1.0 : 0.6, // Semi-transparent when not speaking
          }}
        >
          <CharacterPortrait
            character="Sable"
            emotion={currentLine.character === "Sable" ? currentLine.emotion : "Neutral"}
            isActive={currentLine.character === "Sable"}
            size={250} // Large portraits
            hideLabels={true}
            simple={true} // No animations or containers
            onLoaded={() => handlePortraitLoaded("Sable")}
            shouldFlip={true} // Flip Sable to face Luma
          />
        </View>
      </View>

      {/* Dialog Box */}
      <View
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {/* Speaker Name */}
        <Text
          style={{
            color: currentLine.character === "Luma" ? "#ffeaa7" : "#a29bfe",
            fontWeight: "700",
            fontSize: 14,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          {currentLine.character}
        </Text>

        {/* Dialog Text */}
        <Text
          style={{
            color: "#ffffff",
            fontSize: 15,
            lineHeight: 20,
            textAlign: "center",
            minHeight: 20,
          }}
        >
          {displayedText}
        </Text>

        {/* Progress Indicator */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 8,
            gap: 4,
          }}
        >
          {conversation.lines.map((_, index) => (
            <View
              key={index}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: index === currentLineIndex
                  ? "#ffffff"
                  : "rgba(255, 255, 255, 0.3)",
              }}
            />
          ))}
        </View>
      </View>

    </Animated.View>
  );
}