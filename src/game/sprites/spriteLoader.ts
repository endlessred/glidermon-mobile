import { AssetMap } from "../../assets/assetMap";
import { resolveModuleId } from "../../assets/assetResolver";
import { SpriteCatalog, SpriteSheetId, AnchorOverride, SocketName, FrameOverride } from "./spriteCatalog";
import { makeGridRig } from "./rig";

export async function resolveSpriteSource(texKey: keyof typeof AssetMap) {
  return resolveModuleId(AssetMap[texKey]);
}

function applyOverrides(
  rig: ReturnType<typeof makeGridRig>,
  cfg: { overrides?: FrameOverride[] }
) {
  if (!cfg.overrides) return rig;

  for (const ov of cfg.overrides) {
    const indices: number[] =
      "index" in ov
        ? [ov.index]
        : Array.from({ length: ov.range[1] - ov.range[0] + 1 }, (_, i) => ov.range[0] + i);

    for (const idx of indices) {
      const f = rig.frames[idx];
      if (!f) continue;

      for (const socket of Object.keys(ov.anchor) as SocketName[]) {
        const change = ov.anchor[socket] as AnchorOverride | undefined;
        if (!change) continue;

        const base = f.anchors[socket] ?? { x: 0, y: 0, rot: 0 };
        const mode = change.mode ?? "set";

        f.anchors[socket] = {
          x: mode === "add" ? base.x + (change.x ?? 0) : (change.x ?? base.x),
          y: mode === "add" ? base.y + (change.y ?? 0) : (change.y ?? base.y),
          rot:
            mode === "add"
              ? (base.rot ?? 0) + (change.rot ?? 0)
              : (change.rot ?? base.rot),
        };
      }
    }
  }

  return rig;
}

export async function buildRigFromCatalog(id: SpriteSheetId) {
  const cfg = SpriteCatalog[id];
  if (!cfg) throw new Error(`Unknown sheet id: ${id}`);

  const tex = await resolveSpriteSource(cfg.texKey);

  // Base grid rig with headTop seeded; we’ll merge the other default sockets below.
  const rig = makeGridRig(
    tex,
    cfg.grid.cols,
    cfg.grid.rows,
    cfg.grid.w,
    cfg.grid.h,
    cfg.pivot.x,
    cfg.pivot.y,
    cfg.defaultAnchors.headTop
  );

  // Merge all default sockets into each frame
  for (const f of rig.frames) {
    for (const [name, a] of Object.entries(cfg.defaultAnchors)) {
      if (!f.anchors[name as SocketName]) f.anchors[name as SocketName] = { ...a };
    }
  }

  // Apply per-frame overrides
  applyOverrides(rig as any, cfg);

  return { rig, tex };
}

/** For variants like blink: returns the resolved source only */
export async function resolveVariantTex(id: SpriteSheetId) {
  const cfg = SpriteCatalog[id];
  if (!cfg) throw new Error(`Unknown sheet id: ${id}`);
  return resolveSpriteSource(cfg.texKey);
}
