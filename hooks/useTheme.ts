import { useSettingsStore } from "../stores/settingsStore";
import { getTheme, typography, spacing, borderRadius, shadows, components } from "../styles/theme";

export const useTheme = () => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const colors = getTheme(isDarkMode);

  return {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    components,
    isDarkMode,
  };
};

export type Theme = ReturnType<typeof useTheme>;