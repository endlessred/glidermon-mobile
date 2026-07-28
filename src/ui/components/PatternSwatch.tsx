// Small Skia preview of a procedural floor/wall pattern, used in the shop's
// Floors/Walls catalog grids (ShopScreen.tsx). This is a second, vector-based
// approximation of each style -- separate from the pixel-buffer
// THREE.DataTexture generator actually used in the 3D room shell
// (render/proceduralTextures.ts), since the two run in different rendering
// pipelines (2D UI canvas vs. WebGL texture). Both read colors from the same
// FAMILY_COLORS table (proceduralPatternCatalog.ts) so the shop preview and
// the real in-scene look never drift apart.
import React, { useMemo } from "react";
import { Canvas, Rect, Circle, Line, Path, Group, vec } from "@shopify/react-native-skia";
import {
  FAMILY_COLORS,
  PatternFamily,
  FloorPatternStyle,
  WallPatternStyle,
} from "../../game/housing/types/proceduralPatternCatalog";

interface PatternSwatchProps {
  family: PatternFamily;
  style: FloorPatternStyle | WallPatternStyle;
  size?: number;
}

// Deterministic pseudo-random in [0,1), matching the hash style used by the
// in-scene generator's noise function -- stable across re-renders with no
// seeded-RNG dependency.
function pseudoRandom(seed: number): number {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function hexPath(cx: number, cy: number, r: number): string {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    d += i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
  }
  return d + "Z";
}

export default function PatternSwatch({ family, style, size = 56 }: PatternSwatchProps) {
  const { base, light, dark } = FAMILY_COLORS[family];

  const overlay = useMemo(
    () => renderPattern(style, size, base, light, dark),
    [style, size, base, light, dark]
  );

  return (
    <Canvas style={{ width: size, height: size, borderRadius: 8 }}>
      <Rect x={0} y={0} width={size} height={size} color={base} />
      {overlay}
    </Canvas>
  );
}

function renderPattern(
  style: FloorPatternStyle | WallPatternStyle,
  size: number,
  base: string,
  light: string,
  dark: string
): React.ReactNode {
  switch (style) {
    case "Blank":
      return null;

    case "Carpet": {
      const dots = Array.from({ length: 36 }).map((_, i) => (
        <Circle key={i} cx={pseudoRandom(i * 2 + 1) * size} cy={pseudoRandom(i * 2 + 2) * size} r={0.9} color={light} opacity={0.5} />
      ));
      return <Group>{dots}</Group>;
    }

    case "Checkered": {
      const cells = 4;
      const cell = size / cells;
      const rects: React.ReactNode[] = [];
      for (let r = 0; r < cells; r++) {
        for (let c = 0; c < cells; c++) {
          if ((r + c) % 2 === 1) rects.push(<Rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} color={dark} />);
        }
      }
      return <Group>{rects}</Group>;
    }

    case "DiagonalCheckered": {
      const cells = 6;
      const cell = (size * 1.6) / cells;
      const rects: React.ReactNode[] = [];
      for (let r = 0; r < cells; r++) {
        for (let c = 0; c < cells; c++) {
          if ((r + c) % 2 === 1) rects.push(<Rect key={`${r}-${c}`} x={c * cell - size * 0.3} y={r * cell - size * 0.3} width={cell} height={cell} color={dark} />);
        }
      }
      return (
        <Group transform={[{ rotate: Math.PI / 4 }]} origin={vec(size / 2, size / 2)}>
          {rects}
        </Group>
      );
    }

    case "Wood":
    case "WoodPaneling": {
      const bands = 4;
      const bandHeight = size / bands;
      const rects: React.ReactNode[] = [];
      for (let i = 0; i < bands; i++) {
        rects.push(<Rect key={i} x={0} y={i * bandHeight} width={size} height={bandHeight} color={i % 2 === 0 ? base : light} opacity={i % 2 === 0 ? 1 : 0.35} />);
        rects.push(<Line key={`l${i}`} p1={vec(0, i * bandHeight)} p2={vec(size, i * bandHeight)} color={dark} strokeWidth={1} opacity={0.5} />);
      }
      return <Group>{rects}</Group>;
    }

    case "VerticalPaneling": {
      const bands = 4;
      const bandWidth = size / bands;
      const rects: React.ReactNode[] = [];
      for (let i = 0; i < bands; i++) {
        rects.push(<Rect key={i} x={i * bandWidth} y={0} width={bandWidth} height={size} color={i % 2 === 0 ? base : light} opacity={i % 2 === 0 ? 1 : 0.35} />);
        rects.push(<Line key={`l${i}`} p1={vec(i * bandWidth, 0)} p2={vec(i * bandWidth, size)} color={dark} strokeWidth={1} opacity={0.5} />);
      }
      return <Group>{rects}</Group>;
    }

    case "Brick":
    case "SubwayTile": {
      const thin = style === "SubwayTile";
      const courseHeight = size / (thin ? 6 : 4);
      const brickWidth = size / (thin ? 3 : 2);
      const lines: React.ReactNode[] = [];
      let course = 0;
      for (let y = 0; y <= size; y += courseHeight) {
        lines.push(<Line key={`h${course}`} p1={vec(0, y)} p2={vec(size, y)} color={thin ? light : dark} strokeWidth={thin ? 0.75 : 1.5} opacity={0.8} />);
        const offset = course % 2 === 0 ? 0 : brickWidth / 2;
        for (let x = offset; x <= size; x += brickWidth) {
          lines.push(<Line key={`v${course}-${x}`} p1={vec(x, y)} p2={vec(x, y + courseHeight)} color={thin ? light : dark} strokeWidth={thin ? 0.75 : 1.5} opacity={0.8} />);
        }
        course++;
      }
      return (
        <Group>
          {thin && <Rect x={0} y={0} width={size} height={size} color={light} opacity={0.5} />}
          {lines}
        </Group>
      );
    }

    case "Stripe": {
      const bands = 6;
      const bandHeight = size / bands;
      const rects: React.ReactNode[] = [];
      for (let i = 0; i < bands; i++) {
        if (i % 2 === 1) rects.push(<Rect key={i} x={0} y={i * bandHeight} width={size} height={bandHeight} color={light} opacity={0.7} />);
      }
      return <Group>{rects}</Group>;
    }

    case "PolkaDot": {
      const cells = 4;
      const cell = size / cells;
      const dots: React.ReactNode[] = [];
      for (let r = 0; r < cells; r++) {
        for (let c = 0; c < cells; c++) {
          dots.push(<Circle key={`${r}-${c}`} cx={c * cell + cell / 2} cy={r * cell + cell / 2} r={cell * 0.25} color={dark} />);
        }
      }
      return <Group>{dots}</Group>;
    }

    case "Gingham": {
      const bands = 4;
      const bandSize = size / bands;
      const rects: React.ReactNode[] = [];
      for (let i = 0; i < bands; i += 2) {
        rects.push(<Rect key={`h${i}`} x={0} y={i * bandSize} width={size} height={bandSize} color={light} opacity={0.45} />);
        rects.push(<Rect key={`v${i}`} x={i * bandSize} y={0} width={bandSize} height={size} color={light} opacity={0.45} />);
      }
      return <Group>{rects}</Group>;
    }

    case "Terrazzo": {
      const blobs = Array.from({ length: 14 }).map((_, i) => {
        const tone = pseudoRandom(i * 5 + 1);
        const color = tone > 0.66 ? dark : tone > 0.33 ? light : base;
        return (
          <Circle
            key={i}
            cx={pseudoRandom(i * 3 + 2) * size}
            cy={pseudoRandom(i * 3 + 3) * size}
            r={1.5 + pseudoRandom(i * 3 + 4) * 2.5}
            color={color}
            opacity={0.8}
          />
        );
      });
      return <Group>{blobs}</Group>;
    }

    case "Herringbone": {
      const step = size / 5;
      const lines: React.ReactNode[] = [];
      for (let i = -2; i < 10; i++) {
        const offset = i * step;
        lines.push(<Line key={`a${i}`} p1={vec(offset, 0)} p2={vec(offset + step, step)} color={dark} strokeWidth={2} opacity={0.5} />);
        lines.push(<Line key={`b${i}`} p1={vec(offset, step)} p2={vec(offset + step, 0)} color={dark} strokeWidth={2} opacity={0.3} />);
      }
      return (
        <Group>
          <Rect x={0} y={0} width={size} height={size} color={light} opacity={0.2} />
          {lines}
        </Group>
      );
    }

    case "Basketweave": {
      const block = size / 4;
      const rects: React.ReactNode[] = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const horizontal = (r + c) % 2 === 0;
          const x = c * block;
          const y = r * block;
          if (horizontal) {
            rects.push(<Rect key={`${r}-${c}-1`} x={x + 1} y={y + block * 0.15} width={block - 2} height={block * 0.35} color={light} opacity={0.5} />);
            rects.push(<Rect key={`${r}-${c}-2`} x={x + 1} y={y + block * 0.55} width={block - 2} height={block * 0.35} color={dark} opacity={0.3} />);
          } else {
            rects.push(<Rect key={`${r}-${c}-1`} x={x + block * 0.15} y={y + 1} width={block * 0.35} height={block - 2} color={light} opacity={0.5} />);
            rects.push(<Rect key={`${r}-${c}-2`} x={x + block * 0.55} y={y + 1} width={block * 0.35} height={block - 2} color={dark} opacity={0.3} />);
          }
        }
      }
      return <Group>{rects}</Group>;
    }

    case "Hexagon": {
      const r = size / 6;
      const hexW = r * 1.73;
      const hexH = r * 1.5;
      const hexes: React.ReactNode[] = [];
      let row = 0;
      for (let y = r; y < size + r; y += hexH) {
        const offsetX = row % 2 === 0 ? 0 : hexW / 2;
        for (let x = offsetX; x < size + hexW; x += hexW) {
          hexes.push(<Path key={`${row}-${x}`} path={hexPath(x, y, r)} color={dark} style="stroke" strokeWidth={1} opacity={0.5} />);
        }
        row++;
      }
      return <Group>{hexes}</Group>;
    }

    case "Marble": {
      const veins = Array.from({ length: 4 }).map((_, i) => {
        const y0 = pseudoRandom(i * 7 + 1) * size;
        const path = `M 0 ${y0} Q ${size * 0.3} ${y0 + (pseudoRandom(i * 7 + 2) - 0.5) * size * 0.4}, ${size * 0.6} ${y0 - (pseudoRandom(i * 7 + 3) - 0.5) * size * 0.3} T ${size} ${y0 + (pseudoRandom(i * 7 + 4) - 0.5) * size * 0.4}`;
        return <Path key={i} path={path} color={dark} style="stroke" strokeWidth={1.2} opacity={0.4} />;
      });
      return (
        <Group>
          <Rect x={0} y={0} width={size} height={size} color={light} opacity={0.6} />
          {veins}
        </Group>
      );
    }

    case "Beadboard": {
      const spacing = size / 8;
      const lines: React.ReactNode[] = [];
      for (let x = 0; x <= size; x += spacing) {
        lines.push(<Line key={x} p1={vec(x, 0)} p2={vec(x, size)} color={dark} strokeWidth={1} opacity={0.4} />);
      }
      return <Group>{lines}</Group>;
    }

    case "Wainscoting": {
      const trimY = size * 0.65;
      const spacing = size / 4;
      const grooves: React.ReactNode[] = [];
      for (let x = 0; x <= size; x += spacing) {
        grooves.push(<Line key={x} p1={vec(x, trimY)} p2={vec(x, size)} color={dark} strokeWidth={1} opacity={0.4} />);
      }
      return (
        <Group>
          <Rect x={0} y={0} width={size} height={trimY} color={light} opacity={0.35} />
          <Line p1={vec(0, trimY)} p2={vec(size, trimY)} color={dark} strokeWidth={2} opacity={0.6} />
          {grooves}
        </Group>
      );
    }

    default:
      return null;
  }
}
