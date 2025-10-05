import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert
} from 'react-native';
import { useTheme } from '../../data/hooks/useTheme';
import { useProgressionStore } from '../../data/stores/progressionStore';
import FlappyCanvas, { FlappyCanvasRef } from './FlappyCanvas';
import SimpleFlappyTest from './SimpleFlappyTest';

interface UpsAndDownsScreenProps {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

export default function UpsAndDownsScreen({ navigation }: UpsAndDownsScreenProps = {}) {
  const { colors, typography, spacing } = useTheme();
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameOver'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [dosesNow, setDosesNow] = useState(6);
  const [dosesMax] = useState(6);
  const [showSimpleTest, setShowSimpleTest] = useState(false);
  const [insulinTrigger, setInsulinTrigger] = useState(0);

  const { width, height } = Dimensions.get('window');
  const canvasHeight = Math.min(height * 0.6, width * 0.8); // Responsive canvas size
  const canvasWidth = width - 32; // Account for padding
  const flappyCanvasRef = useRef<FlappyCanvasRef>(null);

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const handleStartGame = () => {
    console.log('🎮 UpsAndDownsScreen: Starting game!');
    setGameState('playing');
    setScore(0);
    setDosesNow(6);
    console.log('🎮 UpsAndDownsScreen: Game state set to playing');
  };

  const handlePause = () => {
    setGameState('paused');
  };

  const handleResume = () => {
    setGameState('playing');
  };

  const handleGameOver = () => {
    if (score > highScore) {
      setHighScore(score);
    }
    setGameState('gameOver');
  };

  const handleStateChange = (newState: 'menu' | 'playing' | 'paused' | 'gameOver') => {
    setGameState(newState);
    if (newState === 'gameOver' && score > highScore) {
      setHighScore(score);
    }
  };

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  const handleInsulinPress = () => {
    console.log('UI insulin button pressed');
    // Try both approaches
    flappyCanvasRef.current?.pressInsulin();
    setInsulinTrigger(Date.now()); // Trigger via prop change
    // Could add haptic feedback or other UI responses here
  };

  const handleRestart = () => {
    setScore(0);
    setGameState('menu');
  };

  const renderMenuScreen = () => (
    <View style={styles.menuContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.background.secondary }]}
          onPress={handleBack}
        >
          <Text style={[styles.backText, { color: colors.text.primary }]}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleSection}>
        <Text style={[{ fontSize: typography.size['2xl'], fontWeight: typography.weight.bold }, styles.gameTitle, { color: colors.text.primary }]}>
          Ups and Downs
        </Text>
        <Text style={[styles.gameIcon]}>🪂</Text>
        <Text style={[{ fontSize: typography.size.base }, styles.gameDescription, { color: colors.text.secondary }]}>
          Navigate your glider through obstacles by managing insulin levels
        </Text>
      </View>

      <View style={styles.gamePreview}>
        <View style={[styles.previewBox, { backgroundColor: colors.background.secondary, borderColor: '#d6d3d1' }]}>
          <Text style={[styles.previewText, { color: colors.text.tertiary }]}>
            🪂 Game Preview
          </Text>
          <Text style={[{ fontSize: typography.size.sm }, { color: colors.text.secondary, textAlign: 'center', marginTop: 8 }]}>
            Tap and hold Insulin button to control your glider!
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: '#0ea5e9' }]}
          onPress={handleStartGame}
        >
          <Text style={[styles.playButtonText, { color: 'white' }]}>
            🎮 Start Game
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: '#dc2626', marginTop: 8 }]}
          onPress={() => setShowSimpleTest(true)}
        >
          <Text style={[styles.playButtonText, { color: 'white' }]}>
            🔬 Simple Test
          </Text>
        </TouchableOpacity>

        <View style={styles.stats}>
          <Text style={[{ fontSize: typography.size.base }, { color: colors.text.secondary }]}>
            High Score: {highScore}
          </Text>
        </View>
      </View>

      <View style={styles.instructions}>
        <Text style={[{ fontSize: typography.size.sm }, { color: colors.text.tertiary, textAlign: 'center' }]}>
          Tap the Insulin button to apply downward impulse{'\n'}
          Avoid obstacles and collect fruit to survive!
        </Text>
      </View>
    </View>
  );

  const renderGameScreen = () => (
    <View style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <View style={styles.gameStats}>
          <Text style={[{ fontSize: typography.size.base }, { color: colors.text.primary }]}>
            Score: {score}
          </Text>
          <View style={styles.insulinMeter}>
            <Text style={[{ fontSize: typography.size.sm }, { color: colors.text.secondary }]}>
              Insulin: {dosesNow}/{dosesMax}
            </Text>
            <View style={styles.doseIndicator}>
              {Array.from({ length: dosesMax }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dosePip,
                    {
                      backgroundColor: i < dosesNow ? '#0ea5e9' : colors.gray[300]
                    }
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.pauseButton, { backgroundColor: colors.background.secondary }]}
          onPress={handlePause}
        >
          <Text style={[{ color: colors.text.primary }]}>⏸️</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.gameCanvasContainer, { height: canvasHeight }]}>
        <FlappyCanvas
          ref={flappyCanvasRef}
          gameState={gameState}
          onStateChange={handleStateChange}
          onScoreUpdate={handleScoreUpdate}
          onInsulinPress={handleInsulinPress}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          insulinTrigger={insulinTrigger}
        />
      </View>

      <View style={styles.gameControls}>
        <TouchableOpacity
          style={[styles.insulinButton, { backgroundColor: colors.status.error }]}
          onPress={handleInsulinPress}
        >
          <Text style={[styles.insulinButtonText]}>
            💉 Insulin
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPausedScreen = () => (
    <View style={styles.overlayContainer}>
      {renderGameScreen()}
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
        <View style={[styles.pauseMenu, { backgroundColor: colors.background.primary }]}>
          <Text style={[{ fontSize: typography.size['2xl'], fontWeight: typography.weight.bold }, { color: colors.text.primary, textAlign: 'center' }]}>
            Game Paused
          </Text>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: '#0ea5e9' }]}
            onPress={handleResume}
          >
            <Text style={[styles.menuButtonText]}>Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: colors.background.secondary }]}
            onPress={handleRestart}
          >
            <Text style={[styles.menuButtonText, { color: colors.text.primary }]}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: colors.background.secondary }]}
            onPress={handleBack}
          >
            <Text style={[styles.menuButtonText, { color: colors.text.primary }]}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderGameOverScreen = () => (
    <View style={styles.overlayContainer}>
      {renderGameScreen()}
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
        <View style={[styles.pauseMenu, { backgroundColor: colors.background.primary }]}>
          <Text style={[{ fontSize: typography.size['2xl'], fontWeight: typography.weight.bold }, { color: colors.text.primary, textAlign: 'center' }]}>
            Game Over!
          </Text>

          <Text style={[{ fontSize: typography.size.lg }, { color: colors.text.primary, textAlign: 'center', marginVertical: 16 }]}>
            Score: {score}
          </Text>

          {score === highScore && (
            <Text style={[{ fontSize: typography.size.base }, { color: '#ffd700', textAlign: 'center', marginBottom: 16 }]}>
              🎉 New High Score! 🎉
            </Text>
          )}

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: '#0ea5e9' }]}
            onPress={handleStartGame}
          >
            <Text style={[styles.menuButtonText]}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: colors.background.secondary }]}
            onPress={handleRestart}
          >
            <Text style={[styles.menuButtonText, { color: colors.text.primary }]}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (showSimpleTest) {
    return <SimpleFlappyTest onBack={() => setShowSimpleTest(false)} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {gameState === 'menu' && renderMenuScreen()}
      {gameState === 'playing' && renderGameScreen()}
      {gameState === 'paused' && renderPausedScreen()}
      {gameState === 'gameOver' && renderGameOverScreen()}
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  gameTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gameIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  gameDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  gamePreview: {
    alignItems: 'center',
    marginBottom: 32,
  },
  previewBox: {
    width: width * 0.8,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 24,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 24,
  },
  playButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  playButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stats: {
    alignItems: 'center',
  },
  instructions: {
    padding: 16,
  },
  gameContainer: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  pauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameCanvasContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#87CEEB',
  },
  gameStats: {
    flex: 1,
  },
  insulinMeter: {
    marginTop: 4,
  },
  doseIndicator: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  dosePip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gameControls: {
    padding: 16,
    alignItems: 'center',
  },
  insulinButton: {
    width: 120,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insulinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlayContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseMenu: {
    width: width * 0.8,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  menuButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});