# Utilities System

Collection of helper functions, utilities, and shared logic used throughout the application for common tasks, debugging, and cross-cutting concerns.

## Key Files

### `logger.ts`
- **Purpose**: Centralized logging system with configurable levels and outputs
- **Features**: Development debugging, error tracking, performance monitoring
- **Levels**: Debug, info, warn, error with conditional output
- **Integration**: Used throughout app for consistent logging

## Logging System

### Log Levels
```typescript
enum LogLevel {
  DEBUG = 0,    // Detailed development information
  INFO = 1,     // General application information
  WARN = 2,     // Warning conditions that should be noted
  ERROR = 3,    // Error conditions that need attention
}
```

### Logger Interface
```typescript
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;

  // Performance tracking
  time(label: string): void;
  timeEnd(label: string): void;

  // Conditional logging
  group(label: string): void;
  groupEnd(): void;
}
```

### Development vs Production
```typescript
// Development: Full logging to console
if (__DEV__) {
  logger.setLevel(LogLevel.DEBUG);
  logger.addOutput(consoleOutput);
}

// Production: Error logging only
else {
  logger.setLevel(LogLevel.ERROR);
  logger.addOutput(crashReportingOutput);
}
```

## Common Utility Categories

### Data Manipulation

#### Array Utilities
```typescript
// Safe array operations
const safeSlice = <T>(array: T[], start: number, end?: number): T[] => {
  if (!Array.isArray(array)) return [];
  return array.slice(start, end);
};

// Remove duplicates
const unique = <T>(array: T[]): T[] => [...new Set(array)];

// Group by property
const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};
```

#### Object Utilities
```typescript
// Deep clone objects
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// Safe property access
const safeGet = <T>(obj: any, path: string, defaultValue: T): T => {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current?.[key] === undefined) return defaultValue;
    current = current[key];
  }

  return current;
};

// Merge objects deeply
const deepMerge = <T>(target: T, source: Partial<T>): T => {
  // Implementation for deep object merging
};
```

### Validation Utilities

#### Type Guards
```typescript
// Type safety helpers
const isNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

const isString = (value: any): value is string => {
  return typeof value === 'string';
};

const isValidGlucoseReading = (value: any): value is number => {
  return isNumber(value) && value >= 40 && value <= 400;
};
```

#### Data Validation
```typescript
// Validate glucose reading
const validateGlucoseReading = (mgdl: number): boolean => {
  if (!isNumber(mgdl)) return false;
  if (mgdl < 40 || mgdl > 400) return false;
  return true;
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate app version
const isValidVersion = (version: string): boolean => {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
};
```

### Time and Date Utilities

#### Date Formatting
```typescript
// Human-readable time differences
const timeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Format timestamp for display
const formatTimestamp = (timestamp: number, format: 'short' | 'long' = 'short'): string => {
  const date = new Date(timestamp);

  if (format === 'short') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleString();
  }
};
```

#### Time Range Utilities
```typescript
// Check if timestamp is within range
const isWithinTimeRange = (timestamp: number, rangeHours: number): boolean => {
  const now = Date.now();
  const rangeMs = rangeHours * 60 * 60 * 1000;
  return (now - timestamp) <= rangeMs;
};

// Get start of day timestamp
const getStartOfDay = (date: Date = new Date()): number => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
};
```

### Performance Utilities

#### Debouncing and Throttling
```typescript
// Debounce function calls
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function calls
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
```

#### Memoization
```typescript
// Simple memoization for expensive computations
const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};
```

### Platform Utilities

#### Platform Detection
```typescript
// Enhanced platform detection
const getPlatformInfo = () => ({
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  isNative: Platform.OS !== 'web',
  version: Platform.Version,
});

// Feature detection
const hasNativeFeature = (feature: string): boolean => {
  switch (feature) {
    case 'healthkit':
      return Platform.OS === 'ios';
    case 'health-connect':
      return Platform.OS === 'android';
    case 'bluetooth':
      return Platform.OS !== 'web';
    default:
      return false;
  }
};
```

#### Device Capabilities
```typescript
// Check device capabilities
const getDeviceCapabilities = () => ({
  hasHealthMonitoring: hasNativeFeature('healthkit') || hasNativeFeature('health-connect'),
  hasBluetooth: hasNativeFeature('bluetooth'),
  hasHapticFeedback: Platform.OS !== 'web',
  hasOrientationLock: Platform.OS !== 'web',
});
```

### Error Handling Utilities

#### Safe Execution
```typescript
// Safe async operation wrapper
const safeAsync = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  errorHandler?: (error: Error) => void
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    logger.error('Safe async operation failed:', error);
    if (errorHandler) {
      errorHandler(error as Error);
    }
    return fallback;
  }
};

// Retry with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries - 1) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};
```

### Development Utilities

#### Debug Helpers
```typescript
// Development-only utilities
const devOnly = <T>(fn: () => T): T | undefined => {
  if (__DEV__) {
    return fn();
  }
  return undefined;
};

// Performance measurement
const measurePerformance = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;

  logger.debug(`${label} took ${duration.toFixed(2)}ms`);
  return result;
};

// Memory usage tracking
const trackMemoryUsage = (label: string) => {
  if (__DEV__ && (performance as any).memory) {
    const memory = (performance as any).memory;
    logger.debug(`${label} - Memory usage:`, {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
    });
  }
};
```

## Usage Patterns

### Logging Best Practices
```typescript
// Component logging
const MyComponent = () => {
  useEffect(() => {
    logger.debug('MyComponent mounted');

    return () => {
      logger.debug('MyComponent unmounted');
    };
  }, []);

  const handleAction = async () => {
    try {
      logger.info('Starting user action');
      await performAction();
      logger.info('User action completed successfully');
    } catch (error) {
      logger.error('User action failed:', error);
    }
  };
};
```

### Error Boundary Integration
```typescript
// Enhanced error boundary with logging
const ErrorBoundaryWithLogging = ({ children }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error('React error boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};
```

### Performance Monitoring
```typescript
// Monitor expensive operations
const ExpensiveComponent = () => {
  const expensiveValue = useMemo(() => {
    return measurePerformance(
      () => computeExpensiveValue(),
      'Expensive computation'
    );
  }, [dependencies]);

  return <div>{expensiveValue}</div>;
};
```

The utilities system provides essential tools and helpers that improve code quality, debugging capabilities, and development experience while maintaining high performance and reliability standards.