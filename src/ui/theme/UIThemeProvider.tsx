// ui/theme/UIThemeProvider.tsx
import React, {createContext, useContext, useMemo} from "react";
import { getUITokens, UITokens, UIMode } from "./uiTheme";
import { useTheme } from "../../data/hooks/useTheme";

const UIContext = createContext<UITokens>(getUITokens("cozy", false));

export const UIThemeProvider: React.FC<{mode?: UIMode; children: React.ReactNode}> = ({
  mode = "cozy",
  children,
}) => {
  const { isDarkMode } = useTheme();
  const value = useMemo(() => getUITokens(mode, isDarkMode), [mode, isDarkMode]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUITokens = () => useContext(UIContext);