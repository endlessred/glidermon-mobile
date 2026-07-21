// ui/theme/uiTheme.ts
export type UIMode = "cozy" | "clinical";

export type UITokens = {
  radius: number;
  outline: number;
  padding: number;
  // colors
  fill: string;
  fillMuted: string;
  fillActive: string;
  outlineColor: string;
  text: string;
  textMuted: string;
  highlight: string; // inner gloss
  shadow: string;
  accent: string; // used by chips / level bars
  pressedOverlay: string;    // translucent dark tint for pressed
  disabledOpacity: number;   // overall alpha for disabled
};

export const cozyLight: UITokens = {
  radius: 16,
  outline: 3,
  padding: 10,
  fill: "#FFF7EC",
  fillMuted: "#F3E6D5",
  fillActive: "#FFE5B0",
  outlineColor: "#3B2C22",
  text: "#2A2019",
  textMuted: "#6D5646",
  highlight: "rgba(255,255,255,0.45)",
  shadow: "rgba(60,30,10,0.18)",
  accent: "#FFB400",
  pressedOverlay: "rgba(0,0,0,0.08)",
  disabledOpacity: 0.55,
};

export const cozyDark: UITokens = {
  radius: 16,
  outline: 3,
  padding: 10,
  fill: "#2A1F17",
  fillMuted: "#3B2C22",
  fillActive: "#4A3426",
  outlineColor: "#FFE5B0",
  text: "#FFF7EC",
  textMuted: "#E6D5C3",
  highlight: "transparent",
  shadow: "rgba(0,0,0,0.4)",
  accent: "#FFB400",
  pressedOverlay: "rgba(255,255,255,0.1)",
  disabledOpacity: 0.45,
};

export const clinicalLight: UITokens = {
  radius: 14,
  outline: 2,
  padding: 10,
  fill: "#FFFFFF",
  fillMuted: "#F5F7FA",
  fillActive: "#E9F2FF",
  outlineColor: "#20262E",
  text: "#11181C",
  textMuted: "#5B6B79",
  highlight: "rgba(255,255,255,0.35)",
  shadow: "rgba(16,24,32,0.10)",
  accent: "#1570EF",
  pressedOverlay: "rgba(0,0,0,0.07)",
  disabledOpacity: 0.55,
};

export const clinicalDark: UITokens = {
  radius: 14,
  outline: 2,
  padding: 10,
  fill: "#1A1D21",
  fillMuted: "#242832",
  fillActive: "#2A3441",
  outlineColor: "#E9F2FF",
  text: "#F5F7FA",
  textMuted: "#9AA4B2",
  highlight: "transparent",
  shadow: "rgba(0,0,0,0.3)",
  accent: "#60A5FA",
  pressedOverlay: "rgba(255,255,255,0.08)",
  disabledOpacity: 0.45,
};

export function getUITokens(mode: UIMode, isDark: boolean): UITokens {
  if (mode === "cozy") {
    return isDark ? cozyDark : cozyLight;
  } else {
    return isDark ? clinicalDark : clinicalLight;
  }
}

// Legacy export for backwards compatibility
export const tokensByMode: Record<UIMode, UITokens> = {
  cozy: cozyLight,
  clinical: clinicalLight,
};