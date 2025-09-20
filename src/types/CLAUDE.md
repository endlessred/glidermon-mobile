# Type Definitions

TypeScript type definitions and augmentations for external libraries and global interfaces used throughout the application.

## Key Files

### `base-64.d.ts`
- **Purpose**: Type definitions for the base-64 encoding library
- **Usage**: Provides TypeScript support for base64 encoding/decoding operations
- **Integration**: Used in data serialization and API communication

### `zustand-augment.d.ts`
- **Purpose**: Augments Zustand store types with custom interfaces
- **Usage**: Extends Zustand's typing system for better development experience
- **Integration**: Provides enhanced type safety for state management

## Type System Architecture

### Global Type Definitions

#### Application Core Types
```typescript
// Core application types used across the system
type AppState = 'loading' | 'ready' | 'error' | 'background';

type Platform = 'ios' | 'android' | 'web';

type Environment = 'development' | 'staging' | 'production';

interface AppMetadata {
  version: string;
  buildNumber: string;
  platform: Platform;
  environment: Environment;
}
```

#### Health Data Types
```typescript
// Blood glucose monitoring types
type GlucoseUnit = 'mg/dL' | 'mmol/L';

type TrendCode = 0 | 1 | 2; // Down, Flat, Up

interface GlucoseReading {
  value: number;
  unit: GlucoseUnit;
  timestamp: number;
  trendCode: TrendCode;
  source: 'healthkit' | 'health-connect' | 'simulator' | 'bluetooth';
}

type GlucoseRange = 'low' | 'in-range' | 'high' | 'critical';

interface GlucoseTarget {
  low: number;
  high: number;
  unit: GlucoseUnit;
}
```

#### Game Types
```typescript
// Game state and progression types
interface PlayerStats {
  level: number;
  xp: number;
  acorns: number;
  totalTimeInRange: number;
  streaks: {
    current: number;
    best: number;
  };
}

interface GameEngine {
  stale: boolean;
  staleSinceMs?: number;
  lastTickMs?: number;
  glucoseState: GlucoseRange;
  trail: GlucoseReading[];
  lastBg?: number;
  points: number;
  xp: number;
  level: number;
  streak: number;
  buffs: {
    focusUntil: number | null;
  };
}

type PetState = 'idle' | 'happy' | 'concerned' | 'alert' | 'sleeping';

interface PetBehavior {
  state: PetState;
  animation: string;
  mood: number; // 0-100
  lastInteraction: number;
}
```

#### UI and Theme Types
```typescript
// Theme and styling types
type ThemeMode = 'light' | 'dark' | 'auto';

type ThemeVariation = 'default' | 'cute' | 'cyberpunk' | 'forest' | 'ocean' | 'sunset';

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  health: {
    inRange: string;
    low: string;
    high: string;
    critical: string;
  };
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    inverse: string;
  };
  border: {
    light: string;
    medium: string;
    strong: string;
  };
}

interface AccessibilitySettings {
  textScale: number; // 0.5 to 2.0
  reduceMotion: boolean;
  highContrast: boolean;
  enableScreenReader: boolean;
}
```

### Store Type Augmentations

#### Zustand Store Extensions
```typescript
// Extend Zustand's built-in types
declare module 'zustand' {
  interface StoreMutators<T, U> {
    // Add custom mutators if needed
  }
}

// Custom persist storage interface
interface CustomStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

// Enhanced store options
interface EnhancedStoreOptions<T> {
  name: string;
  storage?: CustomStorage;
  partialize?: (state: T) => Partial<T>;
  onRehydrateStorage?: () => void;
  version?: number;
  migrate?: (persistedState: any, version: number) => T;
}
```

### External Library Augmentations

#### React Native Extensions
```typescript
// Extend React Native types
declare module 'react-native' {
  interface NativeModules {
    // Add custom native modules
    HealthKitModule?: any;
    BluetoothModule?: any;
  }

  namespace Platform {
    interface PlatformConstants {
      // Add platform-specific constants
      supportsHealthKit?: boolean;
      supportsHealthConnect?: boolean;
      supportsBluetooth?: boolean;
    }
  }
}
```

#### Third-Party Library Types
```typescript
// Skia/Canvas types
declare module '@shopify/react-native-skia' {
  // Extend Skia types if needed
  interface SkiaProps {
    // Custom Skia properties
  }
}

// Health Connect types
declare module 'react-native-health-connect' {
  interface HealthConnectPermission {
    accessType: 'read' | 'write';
    recordType: string;
  }

  interface BloodGlucoseRecord {
    level: {
      inMilligramsPerDeciliter: number;
    };
    time: string;
    metadata?: {
      dataOrigin?: string;
    };
  }
}

// HealthKit types
declare module 'react-native-health' {
  interface HealthValue {
    value: number;
    startDate: string;
    endDate: string;
    sourceId?: string;
    sourceName?: string;
  }

  interface HealthKitPermissions {
    permissions: {
      read: string[];
      write: string[];
    };
  }
}
```

### Utility Types

#### Common Utility Types
```typescript
// Utility types for common patterns
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type KeyValuePair<T = any> = {
  key: string;
  value: T;
};

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type EventHandler<T = any> = (event: T) => void;

type AsyncEventHandler<T = any> = (event: T) => Promise<void>;
```

#### Functional Types
```typescript
// Function and callback types
type Predicate<T> = (item: T) => boolean;

type Mapper<T, U> = (item: T) => U;

type Reducer<T, A> = (state: T, action: A) => T;

type Validator<T> = (value: T) => boolean | string;

type Formatter<T> = (value: T) => string;

type Parser<T> = (input: string) => T | null;
```

### API and Network Types

#### HTTP Types
```typescript
// HTTP request/response types
interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  timestamp: number;
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiEndpoint {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}
```

#### Nightscout API Types
```typescript
// Nightscout CGM service types
interface NightscoutEntry {
  _id: string;
  sgv: number; // Blood glucose value
  date: number; // Unix timestamp
  direction: 'DoubleUp' | 'SingleUp' | 'FortyFiveUp' | 'Flat' | 'FortyFiveDown' | 'SingleDown' | 'DoubleDown';
  type: 'sgv';
  dateString: string;
  trend: number;
}

interface NightscoutProfile {
  _id: string;
  defaultProfile: string;
  store: {
    [profileName: string]: {
      dia: number; // Duration of insulin action
      carbratio: Array<{ time: string; value: number }>;
      sens: Array<{ time: string; value: number }>;
      basal: Array<{ time: string; value: number }>;
      target_low: Array<{ time: string; value: number }>;
      target_high: Array<{ time: string; value: number }>;
      units: 'mg/dl' | 'mmol';
    };
  };
}
```

### Development and Testing Types

#### Test Utilities
```typescript
// Testing helper types
interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mockImplementation: (fn: T) => void;
  mockReturnValue: (value: ReturnType<T>) => void;
  mockClear: () => void;
}

interface TestContext {
  stores: {
    game: any;
    progression: any;
    settings: any;
    cosmetics: any;
  };
  services: {
    health: any;
    bluetooth: any;
  };
}

type TestCase<T> = {
  name: string;
  input: T;
  expected: any;
  setup?: () => void;
  cleanup?: () => void;
};
```

#### Development Tools
```typescript
// Development and debugging types
interface DebugInfo {
  performance: {
    renderTime: number;
    updateTime: number;
    memoryUsage: number;
  };
  state: {
    stores: Record<string, any>;
    navigation: any;
    theme: any;
  };
  network: {
    requests: number;
    errors: number;
    lastRequest: number;
  };
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
}
```

## Type Safety Best Practices

### Strict Type Checking
```typescript
// Enforce strict null checks
interface StrictConfig {
  strictNullChecks: true;
  noImplicitAny: true;
  noImplicitReturns: true;
  exactOptionalPropertyTypes: true;
}
```

### Runtime Type Validation
```typescript
// Runtime validation for API data
const isGlucoseReading = (value: any): value is GlucoseReading => {
  return (
    typeof value === 'object' &&
    typeof value.value === 'number' &&
    typeof value.timestamp === 'number' &&
    ['mg/dL', 'mmol/L'].includes(value.unit) &&
    [0, 1, 2].includes(value.trendCode)
  );
};
```

### Type Guards
```typescript
// Type guards for better type narrowing
const isHealthKitReading = (reading: GlucoseReading): reading is GlucoseReading & { source: 'healthkit' } => {
  return reading.source === 'healthkit';
};

const isInRange = (reading: GlucoseReading, target: GlucoseTarget): boolean => {
  return reading.value >= target.low && reading.value <= target.high;
};
```

The type system provides comprehensive type safety and developer experience improvements while maintaining flexibility for future enhancements and integrations.