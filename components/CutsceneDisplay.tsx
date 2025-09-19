import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing, Dimensions } from "react-native";
import { CutsceneFrame } from "../stores/levelUpStore";

interface CutsceneDisplayProps {
  frames: CutsceneFrame[];
  onComplete: () => void;
  onSkip: () => void;
}

export default function CutsceneDisplay({ frames, onComplete, onSkip }: CutsceneDisplayProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dialogAnim = useRef(new Animated.Value(0)).current;
  const portraitAnim = useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentFrame = frames[currentFrameIndex];
  const isLastFrame = currentFrameIndex >= frames.length - 1;

  // Typewriter effect for dialog text
  const startTyping = (text: string) => {
    if (!text) return;

    setDisplayedText("");
    setIsTyping(true);
    setDialogVisible(true);

    const words = text.split(" ").filter(word => word.length > 0); // Filter out empty strings
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
        typingTimeoutRef.current = setTimeout(typeNextWord, 80); // Adjust speed here
      } else {
        setIsTyping(false);
      }
    };

    typeNextWord();
  };

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only animate on first frame, then instantly show subsequent frames
    if (currentFrameIndex === 0) {
      // Reset animations for first frame
      fadeAnim.setValue(0);
      dialogAnim.setValue(0);
      portraitAnim.setValue(0);
      setDialogVisible(false);

      // Sequence: fade in background, show portrait, then show dialog
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(portraitAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dialogAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        startTyping(currentFrame.dialogText);
      });
    } else {
      // Instant transition for subsequent frames
      startTyping(currentFrame.dialogText);
    }
  }, [currentFrameIndex]);

  const handleContinue = () => {
    // If still typing, complete the text immediately
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setDisplayedText(currentFrame.dialogText);
      setIsTyping(false);
      return;
    }

    // If text is complete, proceed to next frame
    if (isLastFrame) {
      onComplete();
    } else {
      setCurrentFrameIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!currentFrame) return null;

  return (
    <View
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#000",
      }}
    >
      {/* Background Canvas Area */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          backgroundColor: "#1a1a2e",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Placeholder for pixelated character background */}
        <View
          style={{
            width: "100%",
            height: "60%",
            backgroundColor: "#16213e",
            borderRadius: 8,
            margin: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#233043",
          }}
        >
          <Text style={{
            color: "#7f93a8",
            fontSize: 16,
            fontWeight: "600",
            textAlign: "center",
          }}>
            🎮 Pixelated Scene Canvas{"\n"}
            {currentFrame.backgroundImage || "[Background Placeholder]"}
          </Text>
        </View>

        {/* Skip Button */}
        <Pressable
          onPress={handleSkip}
          style={{
            position: "absolute",
            top: 40,
            right: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: "rgba(0,0,0,0.6)",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#4a4a4a",
          }}
        >
          <Text style={{
            color: "#ffffff",
            fontWeight: "600",
            fontSize: 14,
          }}>
            Skip
          </Text>
        </Pressable>
      </Animated.View>

      {/* Character Portrait */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 220,
          left: 30,
          opacity: portraitAnim,
          transform: [{
            translateY: portraitAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })
          }],
        }}
      >
        <View
          style={{
            width: 100,
            height: 120,
            backgroundColor: "#2a3441",
            borderRadius: 12,
            borderWidth: 2,
            borderColor: "#3b556e",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 40 }}>
            {currentFrame.characterPortrait || "👤"}
          </Text>
          <Text style={{
            color: "#9cc4e4",
            fontSize: 10,
            fontWeight: "600",
            marginTop: 4,
          }}>
            PORTRAIT
          </Text>
        </View>
      </Animated.View>

      {/* Dialog Box */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          backgroundColor: "#0b1220",
          borderTopWidth: 3,
          borderTopColor: "#233043",
          opacity: dialogAnim,
          transform: [{
            translateY: dialogAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [200, 0],
            })
          }],
        }}
      >
        <View style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
        }}>
          {/* Speaker Name */}
          {currentFrame.speakerName && (
            <Text style={{
              color: "#4a90e2",
              fontWeight: "700",
              fontSize: 16,
              marginBottom: 8,
            }}>
              {currentFrame.speakerName}
            </Text>
          )}

          {/* Dialog Text */}
          <Text style={{
            color: "#cfe6ff",
            fontSize: 16,
            lineHeight: 24,
            flex: 1,
            marginBottom: 16,
          }}>
            {displayedText}
          </Text>

          {/* Continue Button */}
          {dialogVisible && (
            <View style={{
              alignItems: "center",
            }}>
              <Pressable
                onPress={handleContinue}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  backgroundColor: "#233043",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#2f4661",
                }}
              >
                <Text style={{
                  color: "#ffecd1",
                  fontWeight: "700",
                  fontSize: 16,
                }}>
                  {isTyping ? "Skip Text" : isLastFrame ? "Continue" : "Next"}
                </Text>
              </Pressable>

              <Text style={{
                color: "#7f93a8",
                fontSize: 12,
                marginTop: 8,
                textAlign: "center",
              }}>
                Frame {currentFrameIndex + 1} of {frames.length} • Tap to continue
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}