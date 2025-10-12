import React, { useRef, useEffect, useState } from "react";
import { View, Animated, Text } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { Renderer } from "expo-three";
import { CharacterName, EmotionType } from "../../data/types/conversation";
import { getPortraitEmoji, getCharacterColors, PORTRAIT_ANIMATION_CONFIG } from "../../data/atlas/portraitAtlas";
import { createSpinePortraitController, SpinePortraitController } from "../../spine/createSpinePortraitController";

interface SpineCharacterPortraitProps {
  character: CharacterName;
  emotion: EmotionType;
  isActive: boolean; // Whether this character is currently speaking
  size?: number;
  hideLabels?: boolean; // Hide character name and emotion labels
  simple?: boolean; // Simple mode without animations and containers
  onLoaded?: () => void; // Called when the portrait is fully loaded
  shouldFlip?: boolean; // Whether to flip the character horizontally
}

export default function SpineCharacterPortrait({
  character,
  emotion,
  isActive,
  size = 120,
  hideLabels = false,
  simple = false,
  onLoaded,
  shouldFlip = false
}: SpineCharacterPortraitProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const rafRef = useRef<number>(0);
  const controllerRef = useRef<SpinePortraitController | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const characterColors = getCharacterColors(character);

  // Calculate portrait dimensions
  const portraitWidth = size;
  const portraitHeight = Math.round(size * 1.25); // Portraits are taller

  // Animation loop for the portrait container
  useEffect(() => {
    if (isActive) {
      // Speaking animations: subtle scale + bright appearance
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Brighten when speaking
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      return () => {
        scaleAnim.stopAnimation();
        scaleAnim.setValue(1);
      };
    } else {
      // Listening animations: subtle fade and smaller pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Dim when not speaking
      Animated.timing(fadeAnim, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }).start();

      return () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(0.95);
      };
    }
  }, [isActive]);

  // Update emotion when it changes
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setEmotion(emotion, isActive, shouldFlip);
      if (__DEV__) {
        console.log(`[SpinePortrait] Updated ${character} emotion: ${emotion}, talking: ${isActive}, flipped: ${shouldFlip}`);
      }
    }
  }, [emotion, isActive, character, shouldFlip]);

  const onContextCreate = async (gl: any) => {
    try {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(
        -width / 2, width / 2,
        height / 2, -height / 2,
        -1000, 1000
      );
      camera.position.z = 1;

      const renderer = new Renderer({ gl });
      renderer.sortObjects = true;
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0); // Transparent background

      (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      renderer.toneMapping = THREE.NoToneMapping;

      if (__DEV__) console.log(`[SpinePortrait] Initializing ${character} portrait controller`);

      // Create the Spine portrait controller
      const controller = await createSpinePortraitController({
        character,
        emotion,
        isTalking: isActive,
        size,
        shouldFlip,
      });

      controllerRef.current = controller;

      // Scale the character to fit in the portrait view
      const scaleMultiplier = 0.3; // Adjust this to make portraits larger/smaller
      controller.skeleton.scaleX = scaleMultiplier;
      controller.skeleton.scaleY = scaleMultiplier;

      // Position using root bone at center-bottom approach
      // Center horizontally, position vertically so the bottom of character is at bottom of view
      controller.skeleton.x = 0; // Will be centered by the camera setup
      controller.skeleton.y = -height * 0.3; // Position so feet are near bottom

      controller.mesh.position.set(0, 0, 0);
      scene.add(controller.mesh);

      if (__DEV__) {
        console.log(`[SpinePortrait] ${character} controller ready`, {
          skeletonPos: { x: controller.skeleton.x, y: controller.skeleton.y },
          scale: scaleMultiplier,
          viewSize: { width, height },
        });
      }

      // Render loop
      let lastTime = Date.now() / 1000;
      const renderLoop = () => {
        const now = Date.now() / 1000;
        const delta = now - lastTime;
        lastTime = now;

        // Update the Spine controller
        controller.update(delta);

        renderer.render(scene, camera);
        gl.endFrameEXP();

        rafRef.current = requestAnimationFrame(renderLoop);
      };

      renderLoop();
      setLoadError(null);

      // Notify parent that portrait is loaded
      if (onLoaded) {
        onLoaded();
      }

    } catch (error) {
      console.error(`[SpinePortrait] Error initializing ${character} portrait:`, error);
      setLoadError(`Failed to load ${character} portrait`);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (simple) {
    // Simple mode: just the GLView without animations or containers
    return (
      <View style={{ width: portraitWidth, height: portraitHeight }}>
        {loadError ? (
          <Text
            style={{
              fontSize: size * 0.8,
              textAlign: "center",
            }}
          >
            {getPortraitEmoji(character, emotion)}
          </Text>
        ) : (
          <GLView
            style={{
              width: portraitWidth,
              height: portraitHeight,
            }}
            onContextCreate={onContextCreate}
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Main portrait container */}
      <Animated.View
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: [
            { scale: isActive ? scaleAnim : pulseAnim },
          ],
          opacity: fadeAnim,
        }}
      >
        {/* Portrait content - Spine GL view or emoji fallback */}
        {loadError ? (
          <Text
            style={{
              fontSize: size * 0.8,
              textAlign: "center",
            }}
          >
            {getPortraitEmoji(character, emotion)}
          </Text>
        ) : (
          <View
            style={{
              width: portraitWidth,
              height: portraitHeight,
              backgroundColor: "transparent",
              borderRadius: 8,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isActive ? 0.3 : 0.1,
              shadowRadius: isActive ? 8 : 4,
              elevation: isActive ? 8 : 4,
            }}
          >
            <GLView
              style={{
                width: portraitWidth,
                height: portraitHeight,
              }}
              onContextCreate={onContextCreate}
            />
          </View>
        )}

        {/* Speaking indicator - subtle glow around portrait */}
        {isActive && (
          <View
            style={{
              position: "absolute",
              top: -8,
              left: -8,
              right: -8,
              bottom: -8,
              borderRadius: 8,
              borderWidth: 3,
              borderColor: characterColors.accent,
              opacity: 0.6,
            }}
          />
        )}
      </Animated.View>

      {/* Character name label */}
      {!hideLabels && (
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            fontWeight: "700",
            color: isActive ? characterColors.accent : characterColors.secondary,
            textAlign: "center",
            textShadowColor: "rgba(0, 0, 0, 0.5)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {character}
        </Text>
      )}

      {/* Emotion indicator */}
      {!hideLabels && (
        <Text
          style={{
            fontSize: 12,
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            fontStyle: "italic",
            marginTop: 2,
          }}
        >
          {emotion.toLowerCase()}
        </Text>
      )}

      {/* Debug indicator */}
      {__DEV__ && (
        <Text
          style={{
            fontSize: 8,
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "center",
            marginTop: 2,
          }}
        >
          SPINE {loadError ? "ERROR" : "OK"}
        </Text>
      )}
    </View>
  );
}