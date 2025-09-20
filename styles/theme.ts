// Theme system for health-focused Tamagotchi-inspired app
// Combines nostalgic pixel aesthetics with trustworthy health colors

const baseColors = {
  // Core nostalgic palette - soft, muted tones
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main brand blue - trustworthy and calm
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Health-focused greens - gentle and reassuring
  health: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Healthy green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warm accent colors - Tamagotchi-inspired
  accent: {
    coral: '#ff9999', // Soft coral for warnings/health alerts
    peach: '#ffb399', // Gentle peach for highlights
    lavender: '#c299ff', // Soft purple for special elements
    mint: '#99ffcc', // Fresh mint for success states
    cream: '#fff9e6', // Warm cream for backgrounds
    butter: '#fff2b3', // Soft yellow for notifications
  },

  // Status colors - health-appropriate (same for both themes)
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9',
  },

  // Glucose-specific colors (health context - same for both themes)
  glucose: {
    low: '#ef4444', // Red for low glucose
    normal: '#22c55e', // Green for normal range
    high: '#f59e0b', // Orange for high glucose
    critical: '#dc2626', // Darker red for critical values
  }
};

// Light theme colors
const lightColors = {
  ...baseColors,

  // Neutral grays with warmth - light theme
  gray: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  },

  // Background hierarchy - warmer light tones
  background: {
    primary: '#fdfcfb', // Very light warm white
    secondary: '#f8f6f3', // Slightly warmer secondary
    tertiary: '#f1ede8', // Warm tertiary
    card: '#ffffff',
    overlay: 'rgba(28, 25, 23, 0.8)',
  },

  // Text colors for light theme
  text: {
    primary: '#1c1917', // Dark warm gray
    secondary: '#44403c', // Medium warm gray
    tertiary: '#78716c', // Light warm gray
    accent: '#0369a1', // Brand blue for links/actions
    inverse: '#fafaf9', // Light text for dark backgrounds
  },
};

// Dark theme colors
const darkColors = {
  ...baseColors,

  // Neutral grays for dark theme
  gray: {
    50: '#1c1917',
    100: '#292524',
    200: '#44403c',
    300: '#57534e',
    400: '#78716c',
    500: '#a8a29e',
    600: '#d6d3d1',
    700: '#e7e5e4',
    800: '#f5f5f4',
    900: '#fafaf9',
  },

  // Background hierarchy - dark tones
  background: {
    primary: '#0f0e0d', // Very dark warm
    secondary: '#1c1917', // Dark warm
    tertiary: '#292524', // Medium dark warm
    card: '#1c1917',
    overlay: 'rgba(250, 250, 249, 0.1)',
  },

  // Text colors for dark theme
  text: {
    primary: '#fafaf9', // Light warm
    secondary: '#e7e5e4', // Medium light warm
    tertiary: '#a8a29e', // Muted light warm
    accent: '#7dd3fc', // Lighter brand blue for dark theme
    inverse: '#1c1917', // Dark text for light backgrounds
  },

  // Dark theme accent adjustments
  accent: {
    coral: '#ff7a7a', // Slightly more vibrant for dark theme
    peach: '#ff9466', // Slightly more vibrant for dark theme
    lavender: '#a366ff', // Slightly more vibrant for dark theme
    mint: '#66ff99', // Slightly more vibrant for dark theme
    cream: '#2d2a20', // Dark cream equivalent
    butter: '#3d3b28', // Dark butter equivalent
  },
};

export const getTheme = (isDark: boolean, themeVariation?: string) => {
  // Import theme variations dynamically to avoid circular dependencies
  const { themeVariations } = require('./themeVariations');

  let baseTheme = isDark ? darkColors : lightColors;

  // Apply theme variation if specified and not default
  if (themeVariation && themeVariation !== 'default' && themeVariations[themeVariation]) {
    const variation = themeVariations[themeVariation];
    baseTheme = {
      ...baseTheme,
      primary: variation.primary,
      health: variation.health,
      accent: variation.accent,
      // Add any additional variation-specific colors
      ...(variation.cute && { cute: variation.cute }),
      ...(variation.cyber && { cyber: variation.cyber }),
      ...(variation.nature && { nature: variation.nature }),
      ...(variation.ocean && { ocean: variation.ocean }),
      ...(variation.sunset && { sunset: variation.sunset }),
    };

    // Special adjustments for dark mode + theme combinations
    if (isDark && themeVariation === 'cute') {
      // Kawaii theme in dark mode needs better contrast for certain elements
      baseTheme.accent = {
        ...baseTheme.accent,
        cream: '#3d1a2e', // Much darker pink cream for better contrast with white text
        butter: '#4a1f3a', // Darker pink butter
      };
    }
  }

  return baseTheme;
};

// Default to light theme for backward compatibility
export const colors = lightColors;

export const typography = {
  // Slightly rounded, friendly font weights
  weight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Comfortable, readable sizes
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Line heights for readability
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2.0,
  }
};

export const spacing = {
  // Consistent spacing scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const borderRadius = {
  // Softer, more friendly radius values
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  // Soft, gentle shadows
  sm: {
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Component-specific styles for consistency
export const components = {
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },

  button: {
    primary: {
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    secondary: {
      backgroundColor: colors.background.secondary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.gray[300],
    },
  },

  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  progressBar: {
    track: {
      backgroundColor: colors.gray[200],
      borderRadius: borderRadius.full,
      overflow: 'hidden' as const,
    },
    fill: {
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.full,
    },
  },
};

// Helper functions for dynamic theming
export const getGlucoseColor = (mgdl: number) => {
  if (mgdl < 70) return colors.glucose.low;
  if (mgdl < 180) return colors.glucose.normal;
  if (mgdl < 250) return colors.glucose.high;
  return colors.glucose.critical;
};

export const getTrendIcon = (trend: 0 | 1 | 2 | 3) => {
  switch (trend) {
    case 0: return '↓';
    case 1: return '→';
    case 2: return '↑';
    default: return '—';
  }
};