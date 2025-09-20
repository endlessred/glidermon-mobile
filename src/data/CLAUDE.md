# Data Management System

Complete data layer managing application state, user preferences, and reactive data flow. Built with Zustand for state management and React hooks for data access patterns.

## Directory Structure

### Stores (`stores/`)
Zustand-based state management stores with persistence and computed values.

### Hooks (`hooks/`)
React hooks providing data access patterns and computed state.

### Data Sources (`dataSource.ts`)
Configuration and integration points for external data sources.

## State Management Architecture

### Core Stores

#### `gameStore.ts`
- **Purpose**: Central game state and engine integration
- **State**: Game engine instance, glucose trail, real-time stats
- **Actions**: `onEgvs()` - processes new glucose readings
- **Integration**: Bridge between health data and game engine
- **Persistence**: Game state persisted for session continuity

#### `progressionStore.ts`
- **Purpose**: Player progression, levels, achievements
- **State**: XP, level, acorns (currency), unlocks, streaks
- **Actions**: Level calculations, reward distribution, milestone tracking
- **Features**: Automatic level-up detection, achievement triggers
- **Persistence**: Critical progression data backed up

#### `settingsStore.ts`
- **Purpose**: User preferences and app configuration
- **Categories**:
  - **Accessibility**: Text scale, motion reduction, high contrast
  - **Visual Effects**: Animations, particles, blur effects
  - **Theme**: Color schemes, dark/light mode
  - **Data Source**: Health service settings, simulator configuration
- **Persistence**: Settings synced across app launches

#### `cosmeticsStore.ts`
- **Purpose**: Cosmetic items, inventory, customization
- **Features**: Item catalog, purchase system, equip/unequip
- **Economy**: Integration with progression system currency
- **Categories**: Hats, themes, effects, pets
- **Persistence**: Owned items and equipped state saved

#### `toastStore.ts`
- **Purpose**: Global notification and feedback system
- **Features**: Message queuing, auto-dismiss, severity levels
- **Integration**: Used across app for user feedback
- **Cleanup**: Automatic message pruning with `useAutoPruneToasts`

#### `levelUpStore.ts`
- **Purpose**: Level-up flow and celebration management
- **State**: Level-up queue, unlock reveals, celebration state
- **Features**: Manages level-up sequences, unlock presentations
- **Integration**: Triggered by progression store changes

### Data Flow Patterns

#### Real-time Health Data
```
Health Service → gameStore.onEgvs() → Engine Processing → UI Updates
     ↓               ↓                      ↓               ↓
New Reading → State Update → Scoring/XP → Reactive UI
```

#### User Actions
```
UI Interaction → Store Action → State Update → UI Reaction
     ↓              ↓             ↓            ↓
Button Press → Purchase Item → Update Inventory → Refresh Display
```

#### Progression Flow
```
Game Events → Progression Calculation → Level/Unlock Check → Celebration
     ↓              ↓                         ↓                ↓
Glucose Data → XP Award → Level Up Detection → Level Up UI
```

## React Hooks

### Data Access Hooks

#### `useTheme.ts`
- **Purpose**: Centralized theme and styling access
- **Features**: Dynamic theme switching, accessibility integration
- **Computed**: Responsive typography, color schemes, spacing
- **Integration**: Used by all UI components for consistent styling

#### `useHealthKit.ts` (renamed but handles all health platforms)
- **Purpose**: Health monitoring integration and status
- **Features**: Permission management, real-time monitoring, platform detection
- **Cross-platform**: Works with HealthKit (iOS) and Health Connect (Android)
- **States**: Available, authorized, monitoring, error states

#### `useHudVM.ts`
- **Purpose**: HUD screen view model with computed game state
- **Features**: Trend analysis, range calculations, display formatting
- **Real-time**: Updates with live glucose data
- **Computed**: Derived values for UI display (trend arrows, colors, etc.)

#### `useGlucoseHistory.ts`
- **Purpose**: Historical glucose data access and formatting
- **Features**: Time-series data, trend analysis, range categorization
- **Performance**: Efficient data transformation for chart display
- **Integration**: Connects engine trail data to visualization components

### Hook Patterns

#### Reactive Data Access
```typescript
// Components subscribe to specific store slices
const acorns = useProgressionStore(s => s.acorns);
const level = useProgressionStore(s => s.level);

// Automatically re-render when data changes
```

#### Action Dispatching
```typescript
// Components dispatch actions to update state
const purchaseItem = useCosmeticsStore(s => s.purchase);
const equipItem = useCosmeticsStore(s => s.equip);

// Actions update state and trigger reactive updates
```

#### Computed Values
```typescript
// Hooks provide derived/computed values
const { glucoseTrend, timeInRange, lastReading } = useHudVM();

// Complex calculations done once, cached, shared
```

## Persistence Strategy

### Automatic Persistence
```typescript
// Zustand persist middleware
const settingsStore = create(
  persist(
    (set, get) => ({
      // Store definition
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Selective Persistence
- **Critical Data**: Progression, cosmetics, settings
- **Session Data**: Game state, temporary UI state
- **Cache Data**: Computed values, derived state
- **Sensitive Data**: Health data kept in memory only

### Migration Strategy
- **Version Management**: Handle schema changes gracefully
- **Backwards Compatibility**: Support older data formats
- **Recovery**: Fallback values for corrupted data
- **Cleanup**: Remove obsolete data structures

## Data Validation

### Input Validation
```typescript
// Validate glucose readings
const validateGlucoseReading = (mgdl: number) => {
  if (mgdl < 40 || mgdl > 400) {
    throw new Error('Invalid glucose reading');
  }
  return mgdl;
};
```

### State Consistency
```typescript
// Ensure state consistency
const updateLevel = (xp: number) => {
  const newLevel = calculateLevel(xp);
  if (newLevel > currentLevel) {
    triggerLevelUp(newLevel);
  }
};
```

### Type Safety
```typescript
// Strong typing for state shapes
interface ProgressionState {
  xp: number;
  level: number;
  acorns: number;
  streaks: {
    current: number;
    best: number;
  };
}
```

## Performance Optimization

### Selective Subscriptions
```typescript
// Only subscribe to needed data slices
const acorns = useProgressionStore(s => s.acorns);
// Component only re-renders when acorns change, not other progression data
```

### Computed Value Caching
```typescript
// Expensive calculations cached
const expensiveComputation = useMemo(() => {
  return complexCalculation(glucoseData);
}, [glucoseData]);
```

### Batch Updates
```typescript
// Multiple state updates batched together
set((state) => ({
  ...state,
  xp: newXp,
  level: newLevel,
  acorns: newAcorns,
}));
```

## Integration Points

### Health Services Integration
```typescript
// Health data flows into game store
healthService.observeBloodGlucose((reading) => {
  gameStore.getState().onEgvs(
    reading.value,
    reading.trendCode,
    Math.floor(reading.date.getTime() / 1000)
  );
});
```

### Engine Integration
```typescript
// Store actions call engine functions
onEgvs: (mgdl, trendCode, epochSec) => {
  const result = applyEgvsTick(engine, mgdl, trendCode, epochSec);
  set({ engine: result });
}
```

### UI Integration
```typescript
// Components reactively update from store changes
const Component = () => {
  const data = useStore(s => s.data);
  return <Display data={data} />;
};
```

## Testing Strategy

### Store Testing
```typescript
// Test store actions and state updates
test('purchasing item deducts acorns', () => {
  const store = createCosmeticsStore();
  store.getState().purchase('hat-001', 100);
  expect(store.getState().acorns).toBe(initialAcorns - 100);
});
```

### Hook Testing
```typescript
// Test hook behavior and computed values
test('useHudVM calculates trend correctly', () => {
  const { result } = renderHook(() => useHudVM());
  expect(result.current.trend).toBe('rising');
});
```

### Integration Testing
```typescript
// Test data flow between stores
test('glucose reading triggers XP award', () => {
  gameStore.getState().onEgvs(120, 1, Date.now());
  const xp = progressionStore.getState().xp;
  expect(xp).toBeGreaterThan(0);
});
```

## Error Handling

### Store Error Recovery
```typescript
// Graceful error handling in stores
try {
  const result = riskyOperation();
  set({ data: result });
} catch (error) {
  set({ error: error.message });
  toastStore.getState().addToast('Operation failed');
}
```

### Data Recovery
```typescript
// Recover from corrupted state
const loadState = () => {
  try {
    return JSON.parse(storedState);
  } catch {
    return getDefaultState();
  }
};
```

The data management system provides a robust, performant, and maintainable foundation for all application state, ensuring data consistency and optimal user experience.