# Behavior System Documentation

The behavior system is a comprehensive framework for managing character animations with complex rules and state transitions. It extends the original simple idle system to support sophisticated animation sequences like the chess player example.

## Overview

The behavior system consists of several key components:

1. **BehaviorEngine** - Core state machine that manages transitions
2. **BehaviorDefinition** - Data structure defining states and rules
3. **BehaviorLoader** - Loads and manages behavior definitions
4. **BehaviorSprite** - Enhanced sprite component that uses behaviors
5. **Behavior Files** - JSON files that define custom behaviors

## Quick Start

### Using Built-in Behaviors

```typescript
import { BehaviorLoader, BUILTIN_BEHAVIORS } from "../core/behaviorLoader";
import BehaviorSprite from "../view/BehaviorSprite";

// Use the enhanced idle behavior
<BehaviorSprite
  Skia={Skia}
  rig={spriteRig}
  behavior={BUILTIN_BEHAVIORS.enhancedIdle}
  x={100}
  y={100}
  scale={2}
/>
```

### Loading Custom Behaviors

```typescript
import { useBehaviorByName } from "../view/useGliderBehavior";

function MyComponent() {
  const chessPlayer = useBehaviorByName("chess_player");

  if (!chessPlayer) return <Text>Loading behavior...</Text>;

  return (
    <BehaviorSprite
      behavior={chessPlayer}
      // ... other props
    />
  );
}
```

## Behavior Definition Structure

A behavior definition consists of:

### States
Each state represents a different animation or sprite configuration:

```typescript
{
  name: "thinking",        // Unique state name
  tag: "idle",            // Animation tag from sprite rig
  fps: 4,                 // Animation speed (optional)
  loops: 3,               // How many times to loop (optional)
  blinkTex: "blink.png",  // Custom blink texture (optional)
  blinkMinLoops: 3,       // Blink frequency (optional)
  blinkMaxLoops: 6
}
```

### Transitions
Define when and how to move between states:

```typescript
{
  from: "thinking",       // Source state
  to: "moving",          // Target state
  trigger: "timer",      // What triggers the transition
  condition: {           // Trigger-specific conditions
    minTime: 3000,       // For 'timer' trigger
    maxTime: 8000,
    afterLoops: 2,       // For 'loops' trigger
    probability: 0.1     // For 'random' trigger
  }
}
```

### Trigger Types

1. **timer** - Transition after a time period
2. **loops** - Transition after a number of animation loops
3. **random** - Random chance each loop
4. **external** - Manually triggered via code

## Creating Custom Behaviors

### Method 1: JSON Files

Create a JSON file in the `behaviors/` directory:

```json
{
  "name": "my_behavior",
  "description": "Custom behavior description",
  "initialState": "idle",
  "defaultFps": 8,
  "defaultBlinkSettings": {
    "tex": "idle8blink.png",
    "minLoops": 4,
    "maxLoops": 7
  },
  "states": [
    {
      "name": "idle",
      "tag": "idle"
    },
    {
      "name": "excited",
      "tag": "idle",
      "fps": 12
    }
  ],
  "transitions": [
    {
      "from": "idle",
      "to": "excited",
      "trigger": "random",
      "condition": { "probability": 0.05 }
    },
    {
      "from": "excited",
      "to": "idle",
      "trigger": "timer",
      "condition": { "minTime": 2000 }
    }
  ]
}
```

### Method 2: Programmatic Creation

```typescript
import { BehaviorLoader, type BehaviorDefinition } from "../core/behaviors";

const myBehavior: BehaviorDefinition = {
  name: "programmatic_behavior",
  initialState: "start",
  states: [
    { name: "start", tag: "idle" },
    { name: "end", tag: "idle", fps: 12 }
  ],
  transitions: [
    {
      from: "start",
      to: "end",
      trigger: "timer",
      condition: { minTime: 5000 }
    }
  ]
};

BehaviorLoader.register(myBehavior);
```

## Advanced Usage

### External State Control

You can manually control behavior transitions:

```typescript
const [behaviorEngine, setBehaviorEngine] = useState<BehaviorEngine | null>(null);

// Force a transition
const handleUserAction = () => {
  behaviorEngine?.forceTransition("special_state");
};

// Listen to state changes
useEffect(() => {
  if (!behaviorEngine) return;

  const unsubscribe = behaviorEngine.onStateChange((newState) => {
    console.log("Behavior changed to:", newState.name);
    // Update UI or game state based on behavior
  });

  return unsubscribe;
}, [behaviorEngine]);
```

### Dynamic Behavior Loading

```typescript
import { BehaviorLoader } from "../core/behaviorLoader";

// Load all behavior files at startup
useEffect(() => {
  BehaviorLoader.loadAllFromDirectory()
    .then((behaviors) => {
      console.log("Loaded behaviors:", behaviors.map(b => b.name));
    })
    .catch(console.error);
}, []);
```

## Examples

### Simple Idle with Fidgeting

```json
{
  "name": "fidgety_idle",
  "initialState": "idle",
  "states": [
    { "name": "idle", "tag": "idle" },
    { "name": "fidget", "tag": "idle", "fps": 15, "loops": 1 }
  ],
  "transitions": [
    {
      "from": "idle",
      "to": "fidget",
      "trigger": "random",
      "condition": { "probability": 0.02 }
    },
    {
      "from": "fidget",
      "to": "idle",
      "trigger": "loops",
      "condition": { "afterLoops": 1 }
    }
  ]
}
```

### Complex Sequence (Chess Player)

See `behaviors/chess_player.json` for a full example of a complex multi-state behavior that cycles through thinking, moving pieces, and walking between sides.

### Mood-Based Behavior

The system integrates with your existing glucose-level system:

```typescript
import { useGliderBehaviorDefinition } from "../view/useGliderBehavior";

// Automatically adjusts behavior based on glucose levels
const behavior = useGliderBehaviorDefinition(blinkTexture);
```

## Migration from Legacy System

The new system is fully backward compatible:

```typescript
// Old way (still works)
<AnimatedSprite
  rig={rig}
  blinkTex={blinkSheet}
  blinkEveryMin={4}
  blinkEveryMax={7}
  // ... other props
/>

// New way (enhanced)
<BehaviorSprite
  rig={rig}
  behavior={BUILTIN_BEHAVIORS.enhancedIdle}
  // Legacy props still work as fallbacks
  blinkTex={blinkSheet}
  blinkEveryMin={4}
  blinkEveryMax={7}
  // ... other props
/>
```

## Performance Considerations

- The behavior engine updates every 100ms by default
- State transitions are lightweight and efficient
- JSON behavior files are loaded once and cached
- The system gracefully degrades if behavior files fail to load

## Debugging

Enable debug mode to see behavior state changes:

```typescript
<BehaviorSprite
  behavior={myBehavior}
  onBehaviorStateChange={(state) => {
    console.log("Current state:", state.name, "fps:", state.fps);
  }}
  // ... other props
/>
```

## File Structure

```
core/
  behaviors.ts           # Core types and BehaviorEngine class
  behaviorLoader.ts      # Loader and built-in behaviors
  behaviorTest.ts        # Test utilities

view/
  BehaviorSprite.tsx     # Enhanced sprite component
  useGliderBehavior.ts   # Hooks for behavior management

behaviors/               # Custom behavior JSON files
  chess_player.json
  restless_idle.json
```

This system provides the foundation for rich, interactive character animations that can respond to game state, user actions, and time-based rules while maintaining full backward compatibility with your existing animation code.