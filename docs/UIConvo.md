I’m worried that the ui is looking too generic and wanted to get your thoughts. Is it better to stick with a ui like this to keep it more professional looking since it is a wellness app, or is it smarter to lean into the cozy game side and have more of a bespoke ui?

Short answer: go hybrid.

Use a “cozy shell + clinical core” approach:

Cozy, bespoke UI for the game surfaces (Home, Shop, Outfit, Gallery, room view). That’s where delight builds habit and brand.

Clean, professional UI for health-critical surfaces (glucose readout, trends, thresholds, alerts), where clarity and accessibility trump decoration. Your Hud “Current Glucose” card is the right anchor for that.
What to cozy-up (low risk, high payoff)

Replace the generic tab chips with themed “pebble”/badge tabs and custom icons (acorn, shop bag, wardrobe, palette). Keep large touch targets.

Give cards playful frames only on game views (e.g., subtle woodgrain or stitched edges) while keeping the glucose card flat and high-contrast.

Add character reactions inside the Home card (blink, emotes) and micro-wins (sparkles when you earn acorns). Your Skia/scene layer is perfect for this.

Typography: keep a system font for numbers/data; introduce a friendly display face for section titles on game views only.

Color: define two palettes from one token set—“Calm/Clinical” (neutrals + status colors) and “Cozy” (warm accents). Switch by route.

What to keep clinical

Numbers, trend arrows, thresholds, and any alerting. Maintain strong contrast, minimal animation, and color-blind-safe states (avoid relying on red/green only). Your HUD already exposes mg/dL + thresholds—double down on that clarity.

Implementation path (fast)

Add a theme switch by route: mode: 'clinical' | 'cozy'. Clinical for Glucose/Dexcom, cozy for Home/Shop/Outfit/Gallery.

Create a tiny design-token map (radius, elevation, header font, accent). Clinical uses flatter surfaces and system font; cozy bumps radius/elevation and swaps in the display font and textures.

Introduce 2–3 bespoke components only used in cozy mode (e.g., “SignboardHeader”, “FramedCard”, “PebbleTab”). Leave the health card component unchanged.

This gives you a distinctive look without risking trust where it matters. You’ll feel less “generic” immediately on the Home/Shop views, while the glucose areas stay professional and calming.

Would you recommend hand drawn/png or vector ui elements for things like this? Or possibly something like wired.js to give things a sketchy feel?

Short answer: go hybrid again.

Use vectors for the interactive “UI chrome.” Tabs, buttons, icons, sliders, progress bars, charts, alerts. They scale crisply across DPIs, recolor easily for themes (“clinical” vs “cozy”), and animate smoothly in RN/Skia.

Use hand-drawn PNGs for decorative pieces. Signboards, ribbons, wood/stitched card frames, washi-tape stickers, room plaques. These are where your cozy personality lives, and raster art gives you the texture and charm that vectors struggle to pull off.

What about wired.js / “sketchy” libraries?

I wouldn’t use wired.js in your app. It’s web/DOM-oriented and the jittery hand-drawn strokes can reduce legibility—risky for a wellness product. If you want that vibe, pre-render it as PNG accents or emulate lightly with Skia (subtle rough edges, not wobbly lines).

Quick decision rule

Must scale/recolor/animate or is data-critical? → Vector.

Must look tactile/painterly/brandful and won’t be dynamically resized much? → PNG.

Practical setup that works well in RN + Skia

Vector base components

Implement tabs/buttons as vector shapes (react-native-svg or Skia).

Keep all health readouts (numbers, trend arrows, thresholds) vector + flat for contrast.

Cozy overlays as 9-slice PNGs

Export frames/signboards as 9-slice PNGs (so they resize without distortion).

Ship @1x/@2x/@3x and pack them into a small UI atlas.

Use them only on game surfaces (Home/Shop/Outfit/Gallery), not on glucose/alerts.

Texture & tint

Add a very light noise/woodgrain overlay PNG to unify the cozy screens.

If you need themeable color on PNG pieces, reserve a mask color and run your existing recolor shader only on that range (works great for ribbons/badges).

Micro-animations

Animate vectors (scale, opacity, position) for responsiveness.

Keep PNG ornamentation mostly static (maybe tiny parallax/sparkles), so you’re not burning GPU on textured layers.

Where to use what (concrete)

Vector: top tabs, buttons, progress bars, XP/level chip, icons (acorn/shop/wardrobe/palette), glucose graph & markers, toast banners.

PNG: room card “wood frame,” shop sign, parchment tooltips, collectible badges, ribbons, dividers with leaf/needle motifs.

This will keep the wellness parts clean and trustworthy while letting the rest of the app feel distinctly “GliderMon”—not generic—without performance or readability trade-offs.

Is there any vector ui library that you think would be a good match for the cozy game mixed with Cartoon Network style art in the app?

Short take: there isn’t a single “Cartoon-Network-cozy” vector UI library for RN—your best match is a tiny custom kit on top of Skia, plus a bold icon set.

What I’d use

@shopify/react-native-skia – draw all the chunky, high-contrast shapes (tabs, buttons, chips, progress). Perfect for thick outlines + simple fills.

react-native-svg – for places you’re not using Skia surfaces (icons inside RN views, simple badges).

Phosphor Icons (phosphor-react-native) – big, friendly icon pack with Bold/Fill weights that read like CN line art.

Lottie (lottie-react-native) – sprinkle animated vector icons (e.g., twinkling stars on level-up). Keep animations subtle on health views.

Theming/tokens: Tamagui or Shopify Restyle to hold color, radius, and stroke tokens for your “cozy” and “clinical” modes.

Shapes & polish: react-native-figma-squircle (nice bubbly cards/buttons) and react-native-shadow-2 (soft, game-y drop shadows).

Why this combo works

You get crisp, tintable vectors everywhere (accessibility-friendly), but you’re not forced into Material/Fluent looks.

Phosphor’s bold icons + Skia strokes give that “Cartoon Network” vibe: thick outlines, flat fills, rounded corners.

Tokens let you flip cozy ↔ clinical per screen without rewriting components.

Tiny build plan (fast)

Make 3 Skia primitives you’ll reuse: PebbleTab, BadgeChip, FramedCard (each: rounded rect fill + 3–4dp dark outline + tiny inner highlight).

Drop in Phosphor for nav and action icons.

Keep glucose/alerts on the same primitives but with the clinical token set (flatter fill, higher contrast, no texture).

Avoid generic UI kits (Paper/Elements) for the game surfaces—they’ll fight your style. Use theming + Skia instead, and you’ll land the cozy look without losing the professional feel where it counts.

Are you able to take a crack at making these skia primitives?

heck yeah—here’s a first pass at the three Skia primitives (PebbleTab, BadgeChip, FramedCard) plus a tiny theme system so you can flip cozy ↔ clinical per screen. They’re dependency-light: just react-native, @shopify/react-native-skia, and whatever icon lib you like (e.g., Phosphor).

ui/theme.ts
// ui/theme.ts
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
};

export const cozy: UITokens = {
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
};

export const clinical: UITokens = {
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
};

export const tokensByMode: Record<UIMode, UITokens> = {
  cozy,
  clinical,
};

ui/ThemeProvider.tsx
// ui/ThemeProvider.tsx
import React, {createContext, useContext, useMemo} from "react";
import { tokensByMode, UITokens, UIMode } from "./theme";

const UIContext = createContext<UITokens>(tokensByMode.cozy);

export const UIThemeProvider: React.FC<{mode?: UIMode; children: React.ReactNode}> = ({
  mode = "cozy",
  children,
}) => {
  const value = useMemo(() => tokensByMode[mode], [mode]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUITokens = () => useContext(UIContext);

ui/PebbleTab.tsx

A chunky “pill” tab with thick outline and subtle top gloss. Use it inside a Pressable.

// ui/PebbleTab.tsx
import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Canvas, RoundedRect, Group, LinearGradient, vec } from "@shopify/react-native-skia";
import { useUITokens } from "./ThemeProvider";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  width?: number;
  height?: number;
  LeftIcon?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
};

export const PebbleTab: React.FC<Props> = ({
  label,
  selected = false,
  onPress,
  width = 112,
  height = 44,
  LeftIcon,
  disabled,
  testID,
}) => {
  const t = useUITokens();

  const r = t.radius;
  const outline = t.outline;
  const fill = selected ? t.fillActive : t.fill;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <View style={{ width, height }}>
        <Canvas style={StyleSheet.absoluteFillObject}>
          <Group>
            {/* Base */}
            <RoundedRect x={0} y={0} width={width} height={height} r={r} color={fill} />
            {/* Inner top gloss */}
            <RoundedRect
              x={2}
              y={2}
              width={width - 4}
              height={Math.max(10, height * 0.48)}
              r={r - 2}
            >
              <LinearGradient
                start={vec(width * 0.1, 0)}
                end={vec(width * 0.1, height * 0.48)}
                colors={[t.highlight, "rgba(255,255,255,0)"]}
              />
            </RoundedRect>
            {/* Outline */}
            <RoundedRect
              x={outline / 2}
              y={outline / 2}
              width={width - outline}
              height={height - outline}
              r={r}
              color={t.outlineColor}
              style="stroke"
              strokeWidth={outline}
            />
          </Group>
        </Canvas>

        <View style={[styles.content, { paddingHorizontal: t.padding }]}>
          {LeftIcon ? <View style={styles.icon}>{LeftIcon}</View> : null}
          <Text
            style={[
              styles.label,
              {
                color: selected ? t.text : t.textMuted,
                fontWeight: selected ? "700" : "600",
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { marginRight: 8 },
  label: { fontSize: 16 },
});

ui/BadgeChip.tsx

Tiny status/count chip; good for XP, level, or soft-currency counts.

// ui/BadgeChip.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Canvas, RoundedRect, LinearGradient, vec } from "@shopify/react-native-skia";
import { useUITokens } from "./ThemeProvider";

type Props = {
  text: string;
  width?: number;
  height?: number;
  tone?: "accent" | "muted";
  LeftIcon?: React.ReactNode;
};

export const BadgeChip: React.FC<Props> = ({
  text,
  width = 84,
  height = 32,
  tone = "accent",
  LeftIcon,
}) => {
  const t = useUITokens();
  const outline = Math.max(2, t.outline - 1);
  const r = Math.min(t.radius, height / 2);

  const base = tone === "accent" ? t.accent : t.fillMuted;

  return (
    <View style={{ width, height }}>
      <Canvas style={StyleSheet.absoluteFillObject}>
        {/* Fill with subtle vertical gradient */}
        <RoundedRect x={0} y={0} width={width} height={height} r={r}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={[base, tone === "accent" ? "#FFC94D" : t.fill]}
          />
        </RoundedRect>

        {/* Outline */}
        <RoundedRect
          x={outline / 2}
          y={outline / 2}
          width={width - outline}
          height={height - outline}
          r={r}
          color={t.outlineColor}
          style="stroke"
          strokeWidth={outline}
        />
      </Canvas>

      <View style={styles.row}>
        {LeftIcon ? <View style={{ marginRight: 6 }}>{LeftIcon}</View> : null}
        <Text style={[styles.text, { color: t.text }]} numberOfLines={1}>
          {text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "700" },
});

ui/FramedCard.tsx

A content container with a chunky outline and subtle “inner lip” highlight. Drop anything inside as children.

// ui/FramedCard.tsx
import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Canvas, RoundedRect, Group, LinearGradient, vec } from "@shopify/react-native-skia";
import { useUITokens } from "./ThemeProvider";

type Props = {
  width: number;
  height: number;
  style?: ViewStyle;
  children?: React.ReactNode;
  muted?: boolean; // lighter fill
};

export const FramedCard: React.FC<Props> = ({ width, height, style, children, muted }) => {
  const t = useUITokens();
  const outline = t.outline + 1; // a little chunkier for cards
  const r = t.radius * 1.25;
  const fill = muted ? t.fillMuted : t.fill;

  return (
    <View style={[{ width, height }, style]}>
      <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Group>
          {/* Base */}
          <RoundedRect x={0} y={0} width={width} height={height} r={r} color={fill} />
          {/* Inner lip */}
          <RoundedRect x={6} y={6} width={width - 12} height={height * 0.45} r={r - 8}>
            <LinearGradient
              start={vec(width * 0.2, 6)}
              end={vec(width * 0.2, height * 0.45)}
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]}
            />
          </RoundedRect>
          {/* Outline */}
          <RoundedRect
            x={outline / 2}
            y={outline / 2}
            width={width - outline}
            height={height - outline}
            r={r}
            color={t.outlineColor}
            style="stroke"
            strokeWidth={outline}
          />
        </Group>
      </Canvas>

      {/* Content */}
      <View style={{ flex: 1, padding: t.padding * 1.2 }}>{children}</View>
    </View>
  );
};

Example usage
// Example.tsx
import React, { useState } from "react";
import { View, Text } from "react-native";
import { UIThemeProvider } from "./ui/ThemeProvider";
import { PebbleTab } from "./ui/PebbleTab";
import { BadgeChip } from "./ui/BadgeChip";
import { FramedCard } from "./ui/FramedCard";
import { ShoppingBag, Palette, TShirt } from "phosphor-react-native"; // optional

export default function Example() {
  const [tab, setTab] = useState<"home" | "shop" | "outfit" | "gallery">("home");

  return (
    <UIThemeProvider mode="cozy">
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PebbleTab
            label="Shop"
            LeftIcon={<ShoppingBag size={20} weight="fill" />}
            selected={tab === "shop"}
            onPress={() => setTab("shop")}
          />
          <PebbleTab
            label="Outfit"
            LeftIcon={<TShirt size={20} weight="fill" />}
            selected={tab === "outfit"}
            onPress={() => setTab("outfit")}
          />
          <PebbleTab
            label="Gallery"
            LeftIcon={<Palette size={20} weight="fill" />}
            selected={tab === "gallery"}
            onPress={() => setTab("gallery")}
          />
        </View>

        <BadgeChip text="1,310" LeftIcon={<ShoppingBag size={16} weight="fill" />} />

        <FramedCard width={340} height={180} muted>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>KevMon</Text>
          <Text style={{ marginTop: 6 }}>
            A cozy content card. Drop your room canvas or stats here.
          </Text>
        </FramedCard>
      </View>
    </UIThemeProvider>
  );
}

Notes

Typography: I used RN <Text> for labels so you can keep system fonts for clinical screens and swap a display font on cozy screens without Skia font plumbing.

Performance: These are simple fills + strokes; they batch well. Keep PNG textures for decorations (signboards, ribbons) on top if you want, but the “chrome” is 100% vector.

Tokens: Tweak cozy vs clinical colors/radii once and the components will follow.

Hit targets: Pressable handles a11y + pressed states; you can add a pressed overlay by darkening the fill briefly.

If you want, I can add pressed/disabled visual states, a segmented control version, or a 9-slice PNG “wood frame” that plugs into FramedCard for extra cozy.

Yes please

Absolutely—here’s a polished drop-in update with:

pressed + disabled visual states

a SegmentControl built in Skia (chunky CN-style pill)

a 9-slice PNG “wood frame” option that plugs into FramedCard (uses RN ImageBackground + capInsets, which is the most reliable cross-platform 9-slice in RN/Expo)

0) Tiny color helpers
// ui/color.ts
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const bigint = parseInt(m.length === 3 ? m.split("").map(c => c + c).join("") : m, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
export function rgbToHex(r: number, g: number, b: number) {
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
export function lighten(hex: string, amt = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const L = (v: number) => Math.round(v + (255 - v) * clamp01(amt));
  return rgbToHex(L(r), L(g), L(b));
}
export function darken(hex: string, amt = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const D = (v: number) => Math.round(v * (1 - clamp01(amt)));
  return rgbToHex(D(r), D(g), D(b));
}

1) Pressed & disabled states
Theme tweaks
// ui/theme.ts (add a couple tokens)
export type UITokens = {
  // ...
  pressedOverlay: string;    // translucent dark tint for pressed
  disabledOpacity: number;   // overall alpha for disabled
};

export const cozy: UITokens = {
  // ...
  pressedOverlay: "rgba(0,0,0,0.08)",
  disabledOpacity: 0.55,
};

export const clinical: UITokens = {
  // ...
  pressedOverlay: "rgba(0,0,0,0.07)",
  disabledOpacity: 0.55,
};

PebbleTab (updated)
// ui/PebbleTab.tsx
import React, { useState } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Canvas, RoundedRect, Group, LinearGradient, vec } from "@shopify/react-native-skia";
import { useUITokens } from "./ThemeProvider";
import { darken } from "./color";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  width?: number;
  height?: number;
  LeftIcon?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
};

export const PebbleTab: React.FC<Props> = ({
  label,
  selected = false,
  onPress,
  width = 112,
  height = 44,
  LeftIcon,
  disabled,
  testID,
}) => {
  const t = useUITokens();
  const [pressed, setPressed] = useState(false);
  const r = t.radius;
  const outline = t.outline;
  const baseFill = selected ? t.fillActive : t.fill;
  const fill = pressed ? darken(baseFill, 0.06) : baseFill;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      testID={testID}
      style={{
        opacity: disabled ? t.disabledOpacity : 1,
        transform: pressed ? [{ translateY: 1 }] : undefined,
      }}
    >
      <View style={{ width, height }}>
        <Canvas style={StyleSheet.absoluteFillObject}>
          <Group>
            <RoundedRect x={0} y={0} width={width} height={height} r={r} color={fill} />
            <RoundedRect
              x={2}
              y={2}
              width={width - 4}
              height={Math.max(10, height * 0.48)}
              r={r - 2}
            >
              <LinearGradient
                start={vec(width * 0.1, 0)}
                end={vec(width * 0.1, height * 0.48)}
                colors={[t.highlight, "rgba(255,255,255,0)"]}
              />
            </RoundedRect>
            <RoundedRect
              x={outline / 2}
              y={outline / 2}
              width={width - outline}
              height={height - outline}
              r={r}
              color={t.outlineColor}
              style="stroke"
              strokeWidth={outline}
            />
            {pressed && (
              <RoundedRect x={0} y={0} width={width} height={height} r={r} color={t.pressedOverlay} />
            )}
          </Group>
        </Canvas>

        <View style={[styles.content, { paddingHorizontal: t.padding }]}>
          {LeftIcon ? <View style={styles.icon}>{LeftIcon}</View> : null}
          <Text
            style={[
              styles.label,
              { color: selected ? t.text : t.textMuted, fontWeight: selected ? "700" : "600" },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  icon: { marginRight: 8 },
  label: { fontSize: 16 },
});

BadgeChip (light touch)
// ui/BadgeChip.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Canvas, RoundedRect, LinearGradient, vec } from "@shopify/react-native-skia";
import { useUITokens } from "./ThemeProvider";
import { darken } from "./color";

type Props = {
  text: string;
  width?: number;
  height?: number;
  tone?: "accent" | "muted";
  LeftIcon?: React.ReactNode;
  onPress?: () => void; // optional interactive
  disabled?: boolean;
};

export const BadgeChip: React.FC<Props> = ({
  text,
  width = 84,
  height = 32,
  tone = "accent",
  LeftIcon,
  onPress,
  disabled,
}) => {
  const t = useUITokens();
  const [pressed, setPressed] = useState(false);
  const outline = Math.max(2, t.outline - 1);
  const r = Math.min(t.radius, height / 2);
  const base = tone === "accent" ? t.accent : t.fillMuted;

  const content = (
    <View style={{ width, height }}>
      <Canvas style={StyleSheet.absoluteFillObject}>
        <RoundedRect x={0} y={0} width={width} height={height} r={r}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={[pressed ? darken(base, 0.08) : base, tone === "accent" ? "#FFC94D" : t.fill]}
          />
        </RoundedRect>
        <RoundedRect
          x={outline / 2}
          y={outline / 2}
          width={width - outline}
          height={height - outline}
          r={r}
          color={t.outlineColor}
          style="stroke"
          strokeWidth={outline}
        />
        {pressed && <RoundedRect x={0} y={0} width={width} height={height} r={r} color={t.pressedOverlay} />}
      </Canvas>
      <View style={styles.row}>
        {LeftIcon ? <View style={{ marginRight: 6 }}>{LeftIcon}</View> : null}
        <Text style={[styles.text, { color: t.text }]} numberOfLines={1}>
          {text}
        </Text>
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{ opacity: disabled ? t.disabledOpacity : 1 }}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "700" },
});

2) SegmentControl (Skia, pill with selectable segment)

One outlined pill for the group

Selected segment is a filled sub-rect (rounded on the ends)

Labels/icons overlayed for accessibility + hit targets

// ui/SegmentControl.tsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import { Canvas, RoundedRect } from "@shopify/react-native-skia";
import { useUITokens } from "./ThemeProvider";

type Item = { key: string; label: string; Icon?: React.ReactNode };
type Props = {
  items: Item[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  height?: number;
};

export const SegmentControl: React.FC<Props> = ({
  items,
  selectedIndex,
  onChange,
  width = 320,
  height = 44,
}) => {
  const t = useUITokens();
  const outline = t.outline + 0.5;
  const r = t.radius + 6;
  const segW = width / items.length;

  return (
    <View style={{ width, height }}>
      <Canvas style={{ position: "absolute", inset: 0 }}>
        {/* Outer pill */}
        <RoundedRect x={0} y={0} width={width} height={height} r={r} color={t.fill} />
        {/* Selected segment fill */}
        {items.map((_, i) => {
          if (i !== selectedIndex) return null;
          const x = i * segW;
          const isFirst = i === 0;
          const isLast = i === items.length - 1;
          const rr = isFirst || isLast ? r - 2 : 0;
          return (
            <RoundedRect
              key={`seg-${i}`}
              x={x + 2}
              y={2}
              width={segW - 4}
              height={height - 4}
              r={rr}
              color={t.fillActive}
            />
          );
        })}
        {/* Outline on top */}
        <RoundedRect
          x={outline / 2}
          y={outline / 2}
          width={width - outline}
          height={height - outline}
          r={r}
          color={t.outlineColor}
          style="stroke"
          strokeWidth={outline}
        />
      </Canvas>

      {/* Touch + labels */}
      <View style={{ flexDirection: "row", width, height }}>
        {items.map((it, i) => {
          const selected = i === selectedIndex;
          return (
            <Pressable
              key={it.key}
              onPress={() => onChange(i)}
              style={{
                width: segW,
                height,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {it.Icon ? <View style={{ marginRight: 6 }}>{it.Icon}</View> : null}
                <Text
                  numberOfLines={1}
                  style={{
                    fontWeight: selected ? "700" : "600",
                    color: selected ? t.text : t.textMuted,
                  }}
                >
                  {it.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};