// ui/components/adventureBoard/AdventureBoardDrawing.ts
//
// The ONE drawing layer for the Daily Adventure Board's dynamic content --
// pure Skia, no React Native `View`/`Text`. Used by:
//   - AdventureBoardCanvas.tsx  : on-screen <Canvas> for the check-in preview
//   - render/adventureBoardTexture.ts : offscreen -> pixels -> THREE.DataTexture
//     for the in-world board surface plane (adventureBoard3D.ts)
//
// It never touches goal/CGM/reward logic -- it only draws an AdventureBoardModel
// at a given logical resolution and density.
import { Skia, PaintStyle, type SkCanvas, type SkFont } from "@shopify/react-native-skia";
import { matchFont } from "@shopify/react-native-skia";
import { AdventureBoardModel, PrimaryGoalView } from "../../../data/selectors/adventureBoard";
import {
  BOARD_INK,
  BOARD_INK_MUTED,
  BOARD_SURFACE,
  BOARD_GREEN,
  BOARD_AMBER,
} from "./boardStyles";

const HAIRLINE = "rgba(74,49,44,0.18)";
const PALE_GREEN = "#E3EEDD";

export type BoardDensity = "full" | "compact";

export interface AdventureBoardDrawInput {
  model: AdventureBoardModel;
  density: BoardDensity;
  /** Logical draw size (px). Aspect should match the physical board opening. */
  width: number;
  height: number;
  /** Check-in staggered reveal cursor. undefined = show everything. */
  revealStep?: number;
}

export interface AdventureBoardHitRegion {
  id: "start-checkin";
  /** Fractions of the drawn surface (0..1), origin top-left. */
  x: number;
  y: number;
  width: number;
  height: number;
}

// Reveal-step gating (mirrors boardStyles' REVEAL_* order).
const R_PRIMARY = 1;
const R_MINOR_1 = 2;
const R_MINOR_2 = 3;
const R_SUMMARY = 4;

// ── font cache (matchFont hits FontMgr each call) ──────────────────────────
const fontCache = new Map<string, SkFont>();
function font(size: number, weight: "400" | "700" | "800" | "900" = "700"): SkFont {
  const key = `${size}|${weight}`;
  let f = fontCache.get(key);
  if (!f) {
    f = matchFont({ fontFamily: "sans-serif", fontSize: size, fontWeight: weight });
    fontCache.set(key, f);
  }
  return f;
}

function fill(color: string) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  return p;
}
function stroke(color: string, w: number) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(w);
  p.setColor(Skia.Color(color));
  return p;
}

type TextOpts = {
  size: number;
  weight?: "400" | "700" | "800" | "900";
  color?: string;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  ellipsize?: boolean;
};

/** Draws text with its TOP at `topY`. Returns the line height used. */
function drawText(canvas: SkCanvas, str: string, x: number, topY: number, o: TextOpts): number {
  const f = font(o.size, o.weight ?? "700");
  const paint = fill(o.color ?? BOARD_INK);
  let text = str;
  let w = f.getTextWidth(text, paint);
  if (o.maxWidth && w > o.maxWidth && o.ellipsize !== false) {
    while (text.length > 1 && f.getTextWidth(text + "…", paint) > o.maxWidth) {
      text = text.slice(0, -1);
    }
    text = text.trimEnd() + "…";
    w = f.getTextWidth(text, paint);
  }
  const m = f.getMetrics();
  const baseline = topY - m.ascent;
  let dx = x;
  if (o.align === "center") dx = x - w / 2;
  else if (o.align === "right") dx = x - w;
  canvas.drawText(text, dx, baseline, paint, f);
  return -m.ascent + m.descent;
}

function drawHairline(canvas: SkCanvas, x0: number, x1: number, y: number, thickness: number) {
  canvas.drawRect(Skia.XYWHRect(x0, y - thickness / 2, x1 - x0, thickness), fill(HAIRLINE));
}

/** ✓ inside a green disc with an ink ring, centred on (cx, cy). */
function drawCheck(canvas: SkCanvas, cx: number, cy: number, r: number) {
  canvas.drawCircle(cx, cy, r, fill(BOARD_GREEN));
  canvas.drawCircle(cx, cy, r, stroke(BOARD_INK, r * 0.16));
  const p = Skia.Path.Make();
  p.moveTo(cx - r * 0.42, cy + r * 0.02);
  p.lineTo(cx - r * 0.08, cy + r * 0.36);
  p.lineTo(cx + r * 0.46, cy - r * 0.34);
  const s = stroke("#FFF8ED", r * 0.28);
  canvas.drawPath(p, s);
}

/** Empty ○ centred on (cx, cy). */
function drawEmptyCircle(canvas: SkCanvas, cx: number, cy: number, r: number) {
  canvas.drawCircle(cx, cy, r, stroke(BOARD_INK, Math.max(1.4, r * 0.16)));
}

/** A tiny acorn glyph, roughly `size` tall, top-left at (x, y). */
function drawAcorn(canvas: SkCanvas, x: number, y: number, size: number) {
  const w = size * 0.82;
  const capH = size * 0.36;
  const cx = x + w * 0.5;
  // body (rounded blob)
  canvas.drawCircle(cx, y + size * 0.62, w * 0.48, fill("#D98E3C"));
  const tip = Skia.Path.Make();
  tip.moveTo(x + w * 0.16, y + size * 0.72);
  tip.lineTo(x + w * 0.84, y + size * 0.72);
  tip.lineTo(cx, y + size);
  tip.close();
  canvas.drawPath(tip, fill("#D98E3C"));
  // cap
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(x, y, w, capH), capH * 0.5, capH * 0.5),
    fill("#7C5A3C")
  );
}

// ── layout + draw ─────────────────────────────────────────────────────────

function primaryStatus(p: PrimaryGoalView): { label: string; color: string } {
  if (p.windowEnded) {
    return p.evaluation === "met"
      ? { label: "Done", color: BOARD_GREEN }
      : { label: "Missed", color: BOARD_AMBER };
  }
  return p.onTrack ? { label: "On track", color: BOARD_GREEN } : { label: "Off track", color: BOARD_AMBER };
}

function primaryBig(p: PrimaryGoalView): string {
  if (p.evaluation === "met") return "✓";
  return p.displayKind === "tir-pct" ? `${p.displayMetric}%` : `${p.displayMetric}`;
}

function primarySubtitle(p: PrimaryGoalView): string {
  if (p.displayKind === "tir-pct") return p.targetPct != null ? `Target: ${p.targetPct}%` : "";
  const n = p.displayMetric;
  return p.displayKind === "highs-count"
    ? `${n === 1 ? "1 high" : `${n} highs`} so far`
    : `${n === 1 ? "1 low" : `${n} lows`} so far`;
}

/** Compact glance headline. */
function compactLines(model: AdventureBoardModel): { big: string; sub: string | null; tint?: string } {
  if (model.state === "not-planned") return { big: "Plan", sub: "today" };
  if (model.state === "complete") return { big: "DONE!", sub: null, tint: BOARD_GREEN };
  const left = model.minorGoals.filter((g) => !g.done).length;
  const p = model.primary;
  const big = !p
    ? String(left)
    : p.evaluation === "met"
    ? "✓"
    : p.displayKind === "tir-pct"
    ? `${p.displayMetric}%`
    : `${p.displayMetric}`;
  return {
    big,
    sub: left > 0 ? `${left} left` : "on track",
    tint: p?.evaluation === "met" ? BOARD_GREEN : undefined,
  };
}

export function getAdventureBoardHitRegions(input: AdventureBoardDrawInput): AdventureBoardHitRegion[] {
  // v1: while there's no plan, the whole surface starts the check-in.
  if (input.model.state === "not-planned") {
    return [{ id: "start-checkin", x: 0, y: 0, width: 1, height: 1 }];
  }
  return [];
}

export function drawAdventureBoard(canvas: SkCanvas, input: AdventureBoardDrawInput): void {
  const { model, density, width: W, height: H } = input;
  const shown = (at: number) => input.revealStep === undefined || input.revealStep >= at;

  // Opaque cream surface -- the wooden frame supplies the border/occlusion.
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), fill(BOARD_SURFACE));
  // whisper of "tucked under the frame" shade along the top edge
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H * 0.03), fill("rgba(74,49,44,0.05)"));

  if (density === "compact") {
    const { big, sub, tint } = compactLines(model);
    const bigSize = H * 0.24;
    const lh = drawText(canvas, big, W / 2, H / 2 - bigSize * (sub ? 0.85 : 0.5), {
      size: bigSize,
      weight: "900",
      color: tint ?? BOARD_INK,
      align: "center",
    });
    if (sub) {
      drawText(canvas, sub, W / 2, H / 2 - bigSize * 0.85 + lh + H * 0.02, {
        size: H * 0.12,
        weight: "800",
        color: BOARD_INK_MUTED,
        align: "center",
      });
    }
    return;
  }

  // ── FULL density ───────────────────────────────────────────────────────
  const padX = W * 0.075;
  const padY = H * 0.08;
  const contentW = W - padX * 2;

  if (model.state === "not-planned") {
    const s = H * 0.075;
    const lh = drawText(canvas, "Plan today's", W / 2, H * 0.3, {
      size: s,
      weight: "800",
      color: BOARD_INK_MUTED,
      align: "center",
    });
    drawText(canvas, "adventures!", W / 2, H * 0.3 + lh, {
      size: s,
      weight: "800",
      color: BOARD_INK_MUTED,
      align: "center",
    });
    // Start Check-In pill
    const pillW = contentW * 0.82;
    const pillH = H * 0.16;
    const pillX = (W - pillW) / 2;
    const pillY = H * 0.58;
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(pillX, pillY, pillW, pillH), pillH / 2, pillH / 2),
      fill("#E3B54D")
    );
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(pillX, pillY, pillW, pillH), pillH / 2, pillH / 2),
      stroke(BOARD_INK, pillH * 0.09)
    );
    drawText(canvas, "Start Check-In", W / 2, pillY + pillH * 0.28, {
      size: pillH * 0.42,
      weight: "800",
      color: BOARD_INK,
      align: "center",
    });
    return;
  }

  let y = padY;

  // Primary goal
  if (model.primary && shown(R_PRIMARY)) {
    const p = model.primary;
    const bigSize = H * 0.15;
    const met = p.evaluation === "met";
    if (met) {
      drawCheck(canvas, padX + bigSize * 0.42, y + bigSize * 0.55, bigSize * 0.42);
    } else {
      drawText(canvas, primaryBig(p), padX, y + bigSize * 0.06, {
        size: bigSize,
        weight: "900",
        color: p.evaluation === "missed" ? BOARD_INK_MUTED : BOARD_INK,
      });
    }
    const bigW = met ? bigSize : font(bigSize, "900").getTextWidth(primaryBig(p), fill(BOARD_INK));
    const rx = padX + bigW + W * 0.04;
    const rw = W - padX - rx;
    let ry = y + H * 0.005;
    ry += drawText(canvas, p.label, rx, ry, { size: H * 0.078, weight: "800", maxWidth: rw });
    const sub = primarySubtitle(p);
    if (sub) ry += drawText(canvas, sub, rx, ry + H * 0.006, { size: H * 0.058, weight: "700", color: BOARD_INK_MUTED, maxWidth: rw });
    const st = primaryStatus(p);
    drawText(canvas, st.label, rx, ry + H * 0.012, { size: H * 0.058, weight: "800", color: st.color });
    y += H * 0.3;
  }

  drawHairline(canvas, padX, W - padX, y, Math.max(1.2, H * 0.004));
  y += H * 0.035;

  // Minor goals (max 2)
  const visible = model.minorGoals.slice(0, 2);
  const hidden = model.minorGoals.length - visible.length;
  const rowH = H * 0.12;
  visible.forEach((g, i) => {
    const revealed = shown(i === 0 ? R_MINOR_1 : R_MINOR_2);
    if (!revealed) {
      y += rowH;
      return;
    }
    const cy = y + rowH / 2;
    if (g.done) {
      canvas.drawRect(Skia.XYWHRect(padX - W * 0.02, y, contentW + W * 0.04, rowH), fill(PALE_GREEN));
    }
    // bullet
    canvas.drawCircle(padX + rowH * 0.16, cy, rowH * 0.09, fill(g.done ? BOARD_INK_MUTED : BOARD_INK));
    const tx = padX + rowH * 0.42;
    const ctrlR = rowH * 0.2;
    const titleMax = W - padX - ctrlR * 2.6 - tx;
    drawText(canvas, g.title, tx, cy - H * 0.03, {
      size: H * 0.062,
      weight: "700",
      color: g.done ? BOARD_INK_MUTED : BOARD_INK,
      maxWidth: titleMax,
    });
    const ctrlCx = W - padX - ctrlR;
    if (g.done) drawCheck(canvas, ctrlCx, cy, ctrlR);
    else drawEmptyCircle(canvas, ctrlCx, cy, ctrlR);
    if (i < visible.length - 1) drawHairline(canvas, padX, W - padX, y + rowH, Math.max(1, H * 0.003));
    y += rowH;
  });

  // Daily acorn summary
  if (shown(R_SUMMARY)) {
    y += H * 0.03;
    const acornSize = H * 0.058;
    const label = `${model.dailyAcorns} today${hidden > 0 ? `   ·   +${hidden} more` : ""}`;
    const f = font(H * 0.058, "800");
    const lw = f.getTextWidth(label, fill(BOARD_INK));
    const total = acornSize * 0.8 + W * 0.02 + lw;
    const sx = (W - total) / 2;
    drawAcorn(canvas, sx, y, acornSize);
    drawText(canvas, label, sx + acornSize * 0.8 + W * 0.02, y - acornSize * 0.02, {
      size: H * 0.058,
      weight: "800",
      color: BOARD_INK,
    });

    if (model.state === "complete") {
      drawText(canvas, "DONE", W / 2, y + H * 0.11, {
        size: H * 0.09,
        weight: "900",
        color: BOARD_GREEN,
        align: "center",
      });
    }
  }
}

export function createAdventureBoardPicture(input: AdventureBoardDrawInput) {
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, input.width, input.height));
  drawAdventureBoard(canvas, input);
  return rec.finishRecordingAsPicture();
}
