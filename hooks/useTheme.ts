import { useSettingsStore } from "../stores/settingsStore";
import { getTheme, typography as baseTypography, spacing, borderRadius, shadows, components } from "../styles/theme";

export const useTheme = () => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const textScale = useSettingsStore((state) => state.textScale);
  const highContrast = useSettingsStore((state) => state.highContrast);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const themeVariation = useSettingsStore((state) => state.themeVariation);

  const baseColors = getTheme(isDarkMode, themeVariation);

  // Apply high contrast adjustments
  const colors = highContrast ? {
    ...baseColors,
    text: {
      ...baseColors.text,
      primary: isDarkMode ? '#ffffff' : '#000000',
      secondary: isDarkMode ? '#e0e0e0' : '#333333',
    },
    background: {
      ...baseColors.background,
      primary: isDarkMode ? '#000000' : '#ffffff',
      secondary: isDarkMode ? '#1a1a1a' : '#f5f5f5',
      card: isDarkMode ? '#1a1a1a' : '#ffffff',
    },
    primary: {
      ...baseColors.primary,
      500: isDarkMode ? '#60a5fa' : '#1d4ed8', // Higher contrast blue
    },
  } : baseColors;

  // Apply text scaling
  const typography = {
    ...baseTypography,
    size: Object.fromEntries(
      Object.entries(baseTypography.size).map(([key, value]) => [
        key,
        Math.round(value * textScale)
      ])
    ),
  };

  return {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    components,
    isDarkMode,
    textScale,
    highContrast,
    reduceMotion,
  };
};

export type Theme = ReturnType<typeof useTheme>;