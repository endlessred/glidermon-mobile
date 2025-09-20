# Engine System

The engine is the core game logic system that manages all gameplay mechanics, scoring, and state management. It operates independently of UI and can be thought of as the "brain" of the game.

## Key Files

### Core Engine (`index.ts`)
- **Purpose**: Main engine orchestrator and public API
- **Exports**: Primary engine interface used by game components
- **Key Functions**: Engine initialization, state updates, tick processing

### Scoring System (`scoring.ts`)
- **Purpose**: Handles all point calculation, XP, level progression
- **Key Functions**: `applyEgvsTick()` - processes glucose readings into game rewards
- **Mechanics**: Time-in-range bonuses, streak multipliers, level-up triggers
- **Integration**: Called by gameStore when new glucose data arrives

### State Management (`state.ts`)
- **Purpose**: Core game state structure and transitions
- **Contains**: Player stats, glucose data, game flags, buff states
- **Pattern**: Immutable state updates with validation

### Economy System (`economy.ts`)
- **Purpose**: In-game currency, shop pricing, unlock costs
- **Features**: Dynamic pricing, unlock thresholds, cosmetic costs
- **Balance**: Progression pacing and monetization (if applicable)

### RNG System (`rng.ts`)
- **Purpose**: Deterministic random number generation
- **Features**: Seedable PRNG for reproducible results, testing
- **Usage**: Behavior variations, event triggers, cosmetic drops

### Sprites & Assets (`sprites.ts`)
- **Purpose**: Sprite metadata, animation states, asset references
- **Integration**: Links with asset loading system
- **Data**: Frame counts, animation timings, sprite dimensions

### NPCs & Entities (`npc.ts`)
- **Purpose**: Non-player character logic and behavior
- **Features**: AI patterns, interaction states, companion pets
- **Extensible**: Framework for adding new entity types

### Glucose Simulation (`simCgms.ts`)
- **Purpose**: Realistic blood glucose simulation for testing/demo
- **Features**: Physiologically-accurate patterns, trend simulation
- **Modes**: Stable, rising, falling, hypo/hyper episodes
- **Usage**: Development testing, user onboarding, offline mode

### Reset System (`resets.ts`)
- **Purpose**: Game state reset and progression milestones
- **Features**: Prestige mechanics, data cleanup, achievement tracking
- **Safety**: Backup/restore capabilities for accidental resets

### Data Processing (`blePayload.ts`, `buckets.ts`)
- **Purpose**: Real-time data ingestion and processing
- **Features**: BLE packet parsing, data validation, trend analysis
- **Buckets**: Time-series data aggregation and smoothing

## Architecture Principles

### 1. **Pure Functions**
Most engine functions are pure - same input always produces same output. This makes testing and debugging easier.

### 2. **Immutable State**
State changes create new objects rather than mutating existing ones. This prevents side effects and makes state tracking reliable.

### 3. **Event-Driven**
Engine responds to events (glucose readings, user actions) rather than continuously polling. This is efficient and predictable.

### 4. **Platform Agnostic**
Engine has no dependencies on React Native, UI, or platform-specific APIs. It's pure TypeScript that could run anywhere.

## Integration Points

### With Game Store
```typescript
// gameStore calls engine when new data arrives
import { applyEgvsTick } from '../../engine/scoring';

// In store action:
onEgvs: (mgdl, trendCode, epochSec) => {
  const result = applyEgvsTick(engine, mgdl, trendCode, epochSec);
  // Update store with result
}
```

### With Health Services
```typescript
// Health services feed data to engine via gameStore
healthService.observeBloodGlucose((reading) => {
  gameStore.onEgvs(reading.value, trendCode, epochSec);
});
```

### With UI Components
```typescript
// UI reads engine state but never writes to it directly
const engine = useGameStore(s => s.engine);
const points = engine.points;
const level = engine.level;
```

## Testing Strategy

### Unit Tests
Each engine module can be tested in isolation with deterministic inputs:
```typescript
const result = applyEgvsTick(mockEngine, 120, 1, timestamp);
expect(result.points).toBe(expectedPoints);
```

### Integration Tests
Test complete workflows:
```typescript
const engine = createEngine();
const result1 = applyEgvsTick(engine, 120, 1, timestamp1);
const result2 = applyEgvsTick(result1, 130, 2, timestamp2);
// Verify streak, level progression, etc.
```

### Simulation Tests
Use simCgms.ts to generate realistic test data and verify engine behavior over time.

## Performance Considerations

- **Minimal Allocations**: Reuse objects where possible
- **Efficient Algorithms**: O(1) or O(log n) operations preferred
- **Batching**: Process multiple events together when possible
- **Memory Management**: Clean up old data automatically

## Extension Points

### Adding New Mechanics
1. Add state to `state.ts` type definitions
2. Implement logic in appropriate module (or create new one)
3. Update `scoring.ts` or relevant processor
4. Export through `index.ts`

### Custom Behaviors
The engine is designed to be extended with new gameplay mechanics without breaking existing functionality.