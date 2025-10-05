import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Platform, Dimensions } from 'react-native';
import { useTheme } from '../../data/hooks/useTheme';

// Game constants - REVERSE FLAPPY BIRD MECHANICS
const GRAVITY = 0;            // No gravity - we want controlled physics
const AUTO_LIFT = -300;       // px/s^2 upward (like blood sugar rising)
const INSULIN_PUSH = 1200;    // px/s^2 DOWNWARD when pressed (insulin lowers blood sugar) - Increased for more visible effect
const IMPULSE_DURATION = 0.4; // seconds - Increased duration for more noticeable effect
const MAX_VY = 400;           // clamp vertical velocity
const SPEED = 150;            // px/s horizontal world scroll
const SPEED_RAMP = 1;         // px/s every 3s, cap ~240
const GAP_START = 0.50;       // 50% of box height
const GAP_MIN = 0.35;         // 35% floor

// Game types
type GameState = 'ready' | 'playing' | 'paused' | 'gameOver';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Obstacle extends GameObject {
  passed: boolean;
  gapY: number;
  gapHeight: number;
}

interface Fruit extends GameObject {
  collected: boolean;
  type: 'strawberry' | 'blueberry' | 'mango';
}

interface PowerUp extends GameObject {
  type: 'extra_dose' | 'basal_surge' | 'weightless_fruit' | 'chill_wind';
  collected: boolean;
}

interface GameRunState {
  state: GameState;
  // Physics
  gliderY: number;
  gliderVY: number;

  // Insulin system
  dosesMax: number;
  dosesNow: number;
  doseCost: number;
  lastPressAt: number;
  impulseEndAt: number;

  // Game objects
  obstacles: Obstacle[];
  fruits: Fruit[];
  powerUps: PowerUp[];

  // Scoring
  score: number;
  obstaclesCleared: number;
  distanceMeters: number;
  fruitChain: number;
  perfectCenters: number;

  // World state
  worldSpeed: number;
  nextObstacleX: number;
  gameTime: number;
  cloudOffset: number;

  // Modifiers
  fruitBoostEndAt: number;
  powerUpEndAt: number;
  activePowerUp: string | null;
  startDelay: number;
}

interface FlappyCanvasProps {
  gameState: GameState;
  onStateChange: (newState: GameState) => void;
  onScoreUpdate: (score: number) => void;
  onInsulinPress: () => void;
  canvasWidth: number;
  canvasHeight: number;
  insulinTrigger?: number; // Add a trigger prop that changes to trigger insulin
}

export interface FlappyCanvasRef {
  pressInsulin: () => void;
}

const FlappyCanvas = React.forwardRef<FlappyCanvasRef, FlappyCanvasProps>(({
  gameState,
  onStateChange,
  onScoreUpdate,
  onInsulinPress,
  canvasWidth,
  canvasHeight,
  insulinTrigger
}, ref) => {
  const { colors } = useTheme();
  const [Skia, setSkia] = useState<any>(null);
  const [ckReady, setCkReady] = useState(Platform.OS !== "web");

  // Use shared values for animation
  const [currentTime, setCurrentTime] = useState(0);

  // Game state
  const gameRef = useRef<GameRunState>({
    state: 'ready',
    gliderY: canvasHeight * 0.5,
    gliderVY: 0,
    dosesMax: 6,
    dosesNow: 6,
    doseCost: 1,
    lastPressAt: 0,
    impulseEndAt: 0,
    obstacles: [],
    fruits: [],
    powerUps: [],
    score: 0,
    obstaclesCleared: 0,
    distanceMeters: 0,
    fruitChain: 0,
    perfectCenters: 0,
    worldSpeed: SPEED,
    nextObstacleX: canvasWidth + 200,
    gameTime: 0,
    cloudOffset: 0,
    fruitBoostEndAt: 0,
    powerUpEndAt: 0,
    activePowerUp: null,
    startDelay: 0
  });

  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  // Web CanvasKit initialization
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const ready = () => {
      const ck = (globalThis as any).CanvasKit;
      return !!(ck && ck.MakeImageFromEncoded && ck.PictureRecorder);
    };
    if (ready()) {
      setCkReady(true);
      return;
    }
    const id = setInterval(() => {
      if (ready()) {
        clearInterval(id);
        setCkReady(true);
      }
    }, 30);
    return () => clearInterval(id);
  }, []);

  // Load Skia
  useEffect(() => {
    if (Platform.OS === "web" && !ckReady) return;
    const mod = require("@shopify/react-native-skia");
    setSkia(mod);
  }, [ckReady]);

  // Initialize game when state changes to playing
  useEffect(() => {
    if (gameState === 'playing' && gameRef.current.state !== 'playing') {
      initializeGame();
    }
    gameRef.current.state = gameState;
  }, [gameState]);

  const initializeGame = () => {
    const game = gameRef.current;
    game.gliderY = canvasHeight * 0.5;
    game.gliderVY = 0;
    game.dosesMax = 6;
    game.dosesNow = 6;
    game.doseCost = 1;
    game.obstacles = [];
    game.fruits = [];
    game.powerUps = [];
    game.score = 0;
    game.obstaclesCleared = 0;
    game.distanceMeters = 0;
    game.fruitChain = 0;
    game.perfectCenters = 0;
    game.worldSpeed = SPEED;
    game.nextObstacleX = canvasWidth + 200;
    game.gameTime = 0;
    game.fruitBoostEndAt = 0;
    game.powerUpEndAt = 0;
    game.activePowerUp = null;
    game.lastPressAt = 0;
    game.impulseEndAt = 0;
    game.startDelay = Date.now() + 1000; // 1 second delay before physics starts
    game.cloudOffset = 0;

    console.log('Game initialized:', {
      gliderY: game.gliderY,
      canvasHeight,
      canvasWidth
    });
  };

  const handleInsulinPress = useCallback(() => {
    const game = gameRef.current;
    const now = Date.now();

    console.log('Insulin pressed:', {
      gameState: game.state,
      dosesNow: game.dosesNow,
      gliderY: game.gliderY
    });

    if (game.state !== 'playing') return;
    if (now - game.lastPressAt < 120) return; // 120ms cooldown
    if (game.dosesNow < game.doseCost) return;

    game.dosesNow -= game.doseCost;
    game.lastPressAt = now;
    game.impulseEndAt = now + (IMPULSE_DURATION * 1000);

    console.log('Insulin applied, new doses:', game.dosesNow);

    onInsulinPress();
  }, [onInsulinPress]);

  const updatePhysics = (dt: number) => {
    const game = gameRef.current;
    const now = Date.now();

    // Don't apply physics during start delay
    if (now < game.startDelay) {
      return;
    }

    // Calculate acceleration - REVERSE FLAPPY BIRD
    let acc = AUTO_LIFT; // Always rising (like blood sugar)

    // Add fruit boost (more upward lift)
    if (now < game.fruitBoostEndAt) {
      acc += -50; // Additional upward lift from fruit (stronger)
    }

    // Add insulin impulse (DOWNWARD force)
    if (now < game.impulseEndAt) {
      acc += INSULIN_PUSH; // POSITIVE = downward
    }

    // Apply power-up modifiers
    if (game.activePowerUp === 'weightless_fruit' && now < game.powerUpEndAt) {
      acc *= 0.5; // Even more upward lift (harder to control down)
    }

    // Update velocity and position
    const oldVY = game.gliderVY;
    const oldY = game.gliderY;

    game.gliderVY = Math.max(-MAX_VY, Math.min(MAX_VY, game.gliderVY + acc * dt));
    game.gliderY += game.gliderVY * dt;

    // Add debug logging for first few frames
    if (game.gameTime < 1) {
      console.log('Physics update:', {
        dt,
        acc,
        oldVY,
        newVY: game.gliderVY,
        oldY,
        newY: game.gliderY,
        bounds: `0 to ${canvasHeight}`
      });
    }

    // Check bounds - make sure we're using proper bounds
    if (game.gliderY < 0 || game.gliderY > canvasHeight) {
      console.log('Game over - out of bounds:', {
        gliderY: game.gliderY,
        canvasHeight
      });
      onStateChange('gameOver');
      return;
    }

    // Update world speed
    const speedMultiplier = game.activePowerUp === 'chill_wind' && now < game.powerUpEndAt ? 0.8 : 1;
    game.worldSpeed = Math.min(240, SPEED + (game.gameTime * SPEED_RAMP / 3)) * speedMultiplier;

    // Update distance and world movement
    game.distanceMeters += (game.worldSpeed * dt) * 0.02;
    game.gameTime += dt;
    game.cloudOffset += game.worldSpeed * dt * 0.3; // Clouds move slower for parallax
  };

  const spawnObstacle = () => {
    const game = gameRef.current;
    const gapHeight = Math.max(GAP_MIN * canvasHeight, GAP_START * canvasHeight - (game.distanceMeters * 0.5));
    const gapY = Math.random() * (canvasHeight - gapHeight - 100) + 50;

    const obstacle: Obstacle = {
      x: game.nextObstacleX,
      y: 0,
      width: 60,
      height: canvasHeight,
      passed: false,
      gapY,
      gapHeight
    };

    game.obstacles.push(obstacle);
    game.nextObstacleX += 300; // Distance between obstacles

    // Spawn fruit near this obstacle
    const fruitX = obstacle.x + 150;
    const fruitY = gapY + gapHeight * 0.5;

    if (Math.random() < 0.7) { // 70% chance for fruit
      const fruit: Fruit = {
        x: fruitX,
        y: fruitY,
        width: 20,
        height: 20,
        collected: false,
        type: ['strawberry', 'blueberry', 'mango'][Math.floor(Math.random() * 3)] as any
      };
      game.fruits.push(fruit);
    }

    // Rarely spawn power-ups
    if (game.distanceMeters > 150 && Math.random() < 0.03) {
      const powerUp: PowerUp = {
        x: fruitX,
        y: fruitY - 40,
        width: 25,
        height: 25,
        collected: false,
        type: ['extra_dose', 'basal_surge', 'weightless_fruit', 'chill_wind'][Math.floor(Math.random() * 4)] as any
      };
      game.powerUps.push(powerUp);
    }
  };

  const updateGameObjects = (dt: number) => {
    const game = gameRef.current;

    // Move obstacles
    game.obstacles = game.obstacles.filter(obstacle => {
      obstacle.x -= game.worldSpeed * dt;

      // Check if glider passed through obstacle
      if (!obstacle.passed && obstacle.x + obstacle.width < canvasWidth * 0.25) {
        obstacle.passed = true;
        game.obstaclesCleared++;
        game.score += 10;

        // Check if passed through center for perfect bonus
        const gliderCenterY = game.gliderY;
        const gapCenterY = obstacle.gapY + obstacle.gapHeight * 0.5;
        if (Math.abs(gliderCenterY - gapCenterY) < obstacle.gapHeight * 0.1) {
          game.perfectCenters++;
          game.score += 5;
          // Restore some insulin for perfect center pass
          game.dosesNow = Math.min(game.dosesMax, game.dosesNow + 0.25);
        }
      }

      return obstacle.x > -obstacle.width;
    });

    // Move fruits
    game.fruits = game.fruits.filter(fruit => {
      fruit.x -= game.worldSpeed * dt;

      // Check collection
      if (!fruit.collected) {
        const gliderRadius = 15;
        const fruitRadius = 10;
        const dx = fruit.x - (canvasWidth * 0.25);
        const dy = fruit.y - game.gliderY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < gliderRadius + fruitRadius) {
          fruit.collected = true;
          game.fruitChain++;
          game.score += 2;
          game.fruitBoostEndAt = Date.now() + 4000; // 4 second boost
        }
      }

      return fruit.x > -fruit.width && !fruit.collected;
    });

    // Move power-ups
    game.powerUps = game.powerUps.filter(powerUp => {
      powerUp.x -= game.worldSpeed * dt;

      // Check collection
      if (!powerUp.collected) {
        const gliderRadius = 15;
        const powerUpRadius = 12;
        const dx = powerUp.x - (canvasWidth * 0.25);
        const dy = powerUp.y - game.gliderY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < gliderRadius + powerUpRadius) {
          powerUp.collected = true;
          applyPowerUp(powerUp.type);
        }
      }

      return powerUp.x > -powerUp.width && !powerUp.collected;
    });

    // Spawn new obstacles
    if (game.nextObstacleX < canvasWidth + 200) {
      spawnObstacle();
    }

    // Check collisions with obstacles
    checkCollisions();
  };

  const applyPowerUp = (type: PowerUp['type']) => {
    const game = gameRef.current;
    const now = Date.now();

    game.activePowerUp = type;

    switch (type) {
      case 'extra_dose':
        game.dosesNow = Math.min(game.dosesMax, game.dosesNow + 1);
        break;
      case 'basal_surge':
        game.powerUpEndAt = now + 8000; // 8 seconds
        break;
      case 'weightless_fruit':
        game.powerUpEndAt = now + 6000; // 6 seconds
        break;
      case 'chill_wind':
        game.powerUpEndAt = now + 5000; // 5 seconds
        break;
    }
  };

  const checkCollisions = () => {
    const game = gameRef.current;
    const gliderRadius = 15;
    const gliderX = canvasWidth * 0.25;

    for (const obstacle of game.obstacles) {
      // Check if glider is in obstacle's X range
      if (gliderX + gliderRadius > obstacle.x && gliderX - gliderRadius < obstacle.x + obstacle.width) {
        // Check if glider is outside the gap
        if (game.gliderY - gliderRadius < obstacle.gapY ||
            game.gliderY + gliderRadius > obstacle.gapY + obstacle.gapHeight) {
          onStateChange('gameOver');
          return;
        }
      }
    }
  };

  const gameLoop = useCallback((timestamp: number) => {
    if (gameRef.current.state !== 'playing') {
      console.log('Game loop stopped, state:', gameRef.current.state);
      return;
    }

    const dt = Math.min(0.032, (timestamp - lastFrameTimeRef.current) / 1000);
    lastFrameTimeRef.current = timestamp;

    if (dt > 0) {
      updatePhysics(dt);
      updateGameObjects(dt);
      onScoreUpdate(gameRef.current.score);

      // Update React state to trigger Skia re-render
      setCurrentTime(timestamp);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [onScoreUpdate]);

  // Start/stop game loop
  useEffect(() => {
    console.log('Game loop effect, gameState:', gameState);
    if (gameState === 'playing') {
      console.log('Starting game loop');
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      console.log('Stopping game loop');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Expose the insulin press handler via ref
  React.useImperativeHandle(ref, () => ({
    pressInsulin: handleInsulinPress
  }), [handleInsulinPress]);

  // Watch for insulin trigger changes from parent
  React.useEffect(() => {
    if (insulinTrigger && insulinTrigger > 0) {
      console.log('Insulin trigger received from parent:', insulinTrigger);
      handleInsulinPress();
    }
  }, [insulinTrigger, handleInsulinPress]);

  if (!Skia) {
    return null; // Loading state handled by parent
  }

  const { Canvas, Rect, Circle, Group } = Skia;
  const game = gameRef.current;

  // Use currentTime to ensure Canvas re-renders
  const _ = currentTime;

  return (
    <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
      {/* Background */}
      <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} color="#87CEEB" />

      {/* Moving clouds (parallax effect) */}
      <Circle cx={(100 - game.cloudOffset) % (canvasWidth + 100)} cy={80} r={30} color="white" opacity={0.8} />
      <Circle cx={(130 - game.cloudOffset) % (canvasWidth + 100)} cy={70} r={25} color="white" opacity={0.8} />
      <Circle cx={(300 - game.cloudOffset) % (canvasWidth + 100)} cy={120} r={35} color="white" opacity={0.8} />
      <Circle cx={(500 - game.cloudOffset) % (canvasWidth + 100)} cy={90} r={28} color="white" opacity={0.7} />
      <Circle cx={(650 - game.cloudOffset) % (canvasWidth + 100)} cy={110} r={32} color="white" opacity={0.6} />

      {/* Obstacles */}
      {game.obstacles.map((obstacle, i) => (
        <Group key={i}>
          {/* Top obstacle */}
          <Rect
            x={obstacle.x}
            y={0}
            width={obstacle.width}
            height={obstacle.gapY}
            color="#8B4513"
          />
          {/* Bottom obstacle */}
          <Rect
            x={obstacle.x}
            y={obstacle.gapY + obstacle.gapHeight}
            width={obstacle.width}
            height={canvasHeight - (obstacle.gapY + obstacle.gapHeight)}
            color="#8B4513"
          />
        </Group>
      ))}

      {/* Fruits */}
      {game.fruits.map((fruit, i) => (
        <Circle
          key={i}
          cx={fruit.x}
          cy={fruit.y}
          r={fruit.width / 2}
          color={fruit.type === 'strawberry' ? '#FF6B6B' :
                fruit.type === 'blueberry' ? '#4ECDC4' : '#FFD93D'}
        />
      ))}

      {/* Power-ups */}
      {game.powerUps.map((powerUp, i) => (
        <Rect
          key={i}
          x={powerUp.x - powerUp.width/2}
          y={powerUp.y - powerUp.height/2}
          width={powerUp.width}
          height={powerUp.height}
          color="#9B59B6"
        />
      ))}

      {/* Glider (fixed horizontal position, moving vertically) */}
      {/* Insulin glow effect */}
      {Date.now() < game.impulseEndAt && (
        <Circle
          cx={canvasWidth * 0.25}
          cy={game.gliderY}
          r={25}
          color="rgba(220, 38, 38, 0.3)"
        />
      )}

      <Circle
        cx={canvasWidth * 0.25}
        cy={game.gliderY}
        r={15}
        color={Date.now() < game.impulseEndAt ? "#DC2626" : "#F39C12"}
      />

      {/* Start countdown */}
      {Date.now() < game.startDelay && (
        <Rect
          x={canvasWidth * 0.25 - 30}
          y={game.gliderY - 40}
          width={60}
          height={25}
          color="rgba(0,0,0,0.7)"
        />
      )}

      {/* Debug info - remove in production */}
      {/* Score and insulin display will be handled by parent UI */}
    </Canvas>
  );
});

FlappyCanvas.displayName = 'FlappyCanvas';
export default FlappyCanvas;