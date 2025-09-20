# Styles & Theme System

Comprehensive theming and styling system providing consistent design language, accessibility features, and customizable visual experiences across the entire application.

## Key Files

### `theme.ts`
- **Purpose**: Core theme system with design tokens and accessibility features
- **Features**: Dark/light modes, high contrast, responsive typography
- **Design Tokens**: Colors, spacing, typography, borders, shadows
- **Accessibility**: Dynamic text scaling, motion reduction, contrast enhancement

### `themeVariations.ts`
- **Purpose**: Unlockable color theme variations as cosmetic rewards
- **Themes**: Cute, Cyberpunk, Forest, Ocean, Sunset variations
- **Integration**: Cosmetic system unlock progression
- **Customization**: Player-selectable color schemes

## Theme Architecture

### Base Theme System
```typescript
interface Theme {
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
  components: ComponentStyles;
}
```

### Color System
```typescript
interface ColorPalette {
  // Core colors
  primary: string;
  secondary: string;
  accent: string;

  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Health-specific colors
  health: {
    inRange: string;    // Target glucose range
    low: string;        // Hypoglycemia warning
    high: string;       // Hyperglycemia warning
    critical: string;   // Critical values
  };

  // UI colors
  bg: {
    primary: string;    // Main background
    secondary: string;  // Card/panel backgrounds
    tertiary: string;   // Subtle backgrounds
  };

  text: {
    primary: string;    // Main text
    secondary: string;  // Subtitle text
    disabled: string;   // Disabled text
    inverse: string;    // Text on dark backgrounds
  };

  border: {
    light: string;      // Subtle borders
    medium: string;     // Standard borders
    strong: string;     // Emphasized borders
  };
}
```

## Theme Variations

### Cute Theme (Kawaii Dreams)
- **Aesthetic**: Soft pastels, rounded elements, friendly colors
- **Colors**: Pink, lavender, mint, peach tones
- **Usage**: Appeals to users who prefer gentle, friendly interfaces
- **Unlock**: Available at level 5

### Cyberpunk Theme (Neon Nights)
- **Aesthetic**: High contrast, electric colors, futuristic feel
- **Colors**: Neon blue, electric purple, hot pink, acid green
- **Usage**: Appeals to users who prefer bold, dynamic interfaces
- **Unlock**: Available at level 10

### Forest Theme (Woodland)
- **Aesthetic**: Natural greens, earth tones, organic feel
- **Colors**: Forest green, moss, bark brown, sky blue
- **Usage**: Calming, nature-inspired interface
- **Unlock**: Available at level 15

### Ocean Theme (Deep Blue)
- **Aesthetic**: Ocean blues, sea foam, aquatic inspiration
- **Colors**: Deep blue, teal, coral, pearl white
- **Usage**: Serene, flowing interface design
- **Unlock**: Available at level 20

### Sunset Theme (Golden Hour)
- **Aesthetic**: Warm oranges, golden yellows, sunset colors
- **Colors**: Sunset orange, golden yellow, deep red, soft purple
- **Usage**: Warm, energizing interface
- **Unlock**: Available at level 25

## Typography System

### Type Scale
```typescript
interface Typography {
  size: {
    xs: number;    // 12px - Captions, fine print
    sm: number;    // 14px - Secondary text
    base: number;  // 16px - Body text
    lg: number;    // 18px - Subheadings
    xl: number;    // 20px - Headings
    '2xl': number; // 24px - Large headings
    '3xl': number; // 30px - Display text
  };

  weight: {
    light: '300';
    normal: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
  };

  lineHeight: {
    tight: number;   // 1.25 - Headings
    normal: number;  // 1.5 - Body text
    relaxed: number; // 1.75 - Long-form text
  };

  letterSpacing: {
    tight: number;   // -0.025em
    normal: number;  // 0em
    wide: number;    // 0.025em
  };
}
```

### Responsive Typography
```typescript
// Scales with user accessibility settings
const getScaledSize = (baseSize: number, textScale: number) => {
  return baseSize * textScale;
};

// Supports iOS Dynamic Type and Android font scale
const typography = {
  size: {
    base: getScaledSize(16, textScale),
    lg: getScaledSize(18, textScale),
    // ... other sizes
  }
};
```

## Spacing System

### Consistent Spacing Scale
```typescript
interface Spacing {
  xs: number;   // 4px
  sm: number;   // 8px
  md: number;   // 16px
  lg: number;   // 24px
  xl: number;   // 32px
  '2xl': number; // 48px
  '3xl': number; // 64px
}
```

### Usage Guidelines
- **xs (4px)**: Fine adjustments, inner padding
- **sm (8px)**: Small gaps, tight spacing
- **md (16px)**: Standard spacing, most common
- **lg (24px)**: Section spacing, comfortable gaps
- **xl (32px)**: Large section breaks
- **2xl+ (48px+)**: Major layout sections

## Component Styling

### Button Variants
```typescript
interface ButtonStyles {
  primary: {
    background: string;
    text: string;
    border: string;
    pressedBackground: string;
  };
  secondary: {
    background: string;
    text: string;
    border: string;
    pressedBackground: string;
  };
  outline: {
    background: 'transparent';
    text: string;
    border: string;
    pressedBackground: string;
  };
}
```

### Card Styling
```typescript
interface CardStyles {
  background: string;
  border: string;
  borderRadius: number;
  shadow: ShadowStyle;
  padding: {
    sm: number;
    md: number;
    lg: number;
  };
}
```

## Accessibility Features

### High Contrast Mode
```typescript
// Enhanced contrast for better visibility
const getHighContrastColors = (baseColors: ColorPalette) => ({
  ...baseColors,
  text: {
    primary: '#000000',
    secondary: '#333333',
    inverse: '#FFFFFF',
  },
  bg: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#E5E5E5',
  },
});
```

### Motion Reduction
```typescript
// Respects user motion sensitivity preferences
const getAnimationConfig = (reduceMotion: boolean) => ({
  duration: reduceMotion ? 0 : 300,
  easing: reduceMotion ? 'linear' : 'ease-out',
  scale: reduceMotion ? 1 : 1.05,
});
```

### Text Scaling
```typescript
// Supports 50% to 200% text scaling
const textScaleOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

// Automatically adjusts all text sizes
const scaledTypography = scaleTypography(baseTypography, selectedScale);
```

## Theme Application

### React Hook Integration
```typescript
// Primary way components access theme
const { colors, typography, spacing, borderRadius } = useTheme();

// Automatically reactive to theme changes
const buttonStyle = {
  backgroundColor: colors.primary,
  color: colors.text.inverse,
  fontSize: typography.size.base,
  padding: spacing.md,
  borderRadius: borderRadius.md,
};
```

### Dynamic Theme Switching
```typescript
// Users can change themes in real-time
const applyTheme = (themeVariation: ThemeVariation) => {
  const newTheme = getTheme(isDarkMode, themeVariation);
  // All components automatically update
};
```

### Theme Persistence
```typescript
// Theme preferences saved automatically
const settingsStore = create(
  persist(
    (set) => ({
      themeVariation: 'default',
      isDarkMode: false,
      setTheme: (theme) => set({ themeVariation: theme }),
    }),
    { name: 'theme-settings' }
  )
);
```

## Platform Adaptations

### iOS Specific
- **Native Feel**: Matches iOS design language
- **Dynamic Type**: Integrates with iOS accessibility settings
- **Safe Areas**: Proper handling of notches and home indicators

### Android Specific
- **Material Design**: Follows Material Design 3 principles
- **System Theme**: Respects Android system theme preferences
- **Edge-to-Edge**: Handles Android gesture navigation

### Web Specific
- **CSS Variables**: Uses CSS custom properties for theming
- **Media Queries**: Responsive design for different screen sizes
- **Browser Themes**: Integrates with browser dark mode preferences

## Design Tokens

### Color Tokens
```typescript
// Semantic color naming
const colorTokens = {
  // Base palette
  'color-primary-50': '#f0f9ff',
  'color-primary-500': '#3b82f6',
  'color-primary-900': '#1e3a8a',

  // Semantic aliases
  'color-bg-primary': 'color-primary-50',
  'color-text-primary': 'color-primary-900',
  'color-border-primary': 'color-primary-500',
};
```

### Spacing Tokens
```typescript
const spacingTokens = {
  'space-1': '4px',
  'space-2': '8px',
  'space-4': '16px',
  'space-6': '24px',
  'space-8': '32px',
};
```

## Theme Validation

### Contrast Checking
```typescript
// Ensure WCAG compliance
const validateContrast = (foreground: string, background: string) => {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 4.5; // WCAG AA standard
};
```

### Color Accessibility
```typescript
// Check for color blindness accessibility
const validateColorBlindness = (colorPalette: ColorPalette) => {
  // Simulate different types of color blindness
  // Ensure information isn't conveyed by color alone
};
```

## Performance Optimization

### Theme Caching
```typescript
// Cache computed theme values
const themeCache = new Map<string, Theme>();

const getTheme = memoize((isDark: boolean, variation: string) => {
  const cacheKey = `${isDark}-${variation}`;
  if (themeCache.has(cacheKey)) {
    return themeCache.get(cacheKey);
  }

  const theme = computeTheme(isDark, variation);
  themeCache.set(cacheKey, theme);
  return theme;
});
```

### Efficient Updates
```typescript
// Only update affected components
const ThemeProvider = ({ children }) => {
  const theme = useMemo(() => getTheme(isDark, variation), [isDark, variation]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
```

The styles system provides a complete, accessible, and customizable theming solution that enhances user experience while maintaining design consistency and performance.