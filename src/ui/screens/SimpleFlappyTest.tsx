import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../data/hooks/useTheme';

interface SimpleFlappyTestProps {
  onBack: () => void;
}

export default function SimpleFlappyTest({ onBack }: SimpleFlappyTestProps) {
  const { colors, typography } = useTheme();
  const [gliderY, setGliderY] = useState(200);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameTime, setGameTime] = useState(0);

  const velocityRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>();

  const { width, height } = Dimensions.get('window');
  const canvasHeight = 400;

  // Simple physics constants
  const GRAVITY = 400;
  const JUMP_FORCE = -300;

  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.033);
      lastTimeRef.current = timestamp;

      // Update physics
      velocityRef.current += GRAVITY * dt;
      const newY = gliderY + velocityRef.current * dt;

      console.log('Game loop:', {
        dt,
        gliderY,
        newY,
        velocity: velocityRef.current,
        timestamp
      });

      setGliderY(newY);
      setGameTime(prev => prev + dt);

      // Check bounds
      if (newY < 0 || newY > canvasHeight) {
        console.log('Game over - bounds:', newY, canvasHeight);
        setIsPlaying(false);
        return;
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, gliderY]);

  const handleStart = () => {
    console.log('Starting simple test');
    setGliderY(200);
    velocityRef.current = 0;
    setGameTime(0);
    setIsPlaying(true);
  };

  const handleJump = () => {
    console.log('Jump pressed');
    velocityRef.current = JUMP_FORCE;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary, padding: 16 }}>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{
            padding: 12,
            backgroundColor: colors.background.secondary,
            borderRadius: 8
          }}
        >
          <Text style={{ color: colors.text.primary }}>← Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={{
        fontSize: typography.size.xl,
        color: colors.text.primary,
        marginBottom: 20,
        textAlign: 'center'
      }}>
        Simple Physics Test
      </Text>

      <View style={{
        height: canvasHeight,
        backgroundColor: '#87CEEB',
        marginBottom: 20,
        position: 'relative',
        borderRadius: 12
      }}>
        {/* Simple glider */}
        <View style={{
          position: 'absolute',
          left: 50,
          top: gliderY,
          width: 20,
          height: 20,
          backgroundColor: '#F39C12',
          borderRadius: 10
        }} />

        {/* Ground indicator */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: '#8B4513'
        }} />
      </View>

      <View style={{ alignItems: 'center', gap: 16 }}>
        <Text style={{ color: colors.text.primary }}>
          Y: {Math.round(gliderY)} | Velocity: {Math.round(velocityRef.current)} | Time: {gameTime.toFixed(1)}s
        </Text>

        {!isPlaying ? (
          <TouchableOpacity
            onPress={handleStart}
            style={{
              backgroundColor: '#0ea5e9',
              padding: 16,
              borderRadius: 8,
              minWidth: 120
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              Start Test
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleJump}
            style={{
              backgroundColor: '#dc2626',
              padding: 20,
              borderRadius: 10,
              minWidth: 150
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              JUMP
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}