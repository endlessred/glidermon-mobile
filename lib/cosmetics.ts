import cosmeticsJson from "../assets/cosmetics.json";
import { AssetMap, AssetKey } from "../assets/assetMap";
import { resolveModuleId, type SpriteSource } from "./assetResolver";

export type CosmeticDef = {
  id: string;
  name: string;
  socket: "headTop" | "hand" | "earL" | "earR" | "center";
  cost: number;
  tex: SpriteSource;                     // resolved for Skia/RN Image
  pivot: { x: number; y: number };
  offset?: { dx?: number; dy?: number };
  zBias?: number;
};

export async function loadCosmetics(): Promise<CosmeticDef[]> {
  const items = (cosmeticsJson as any).items as Array<{
    id: string; name: string; socket: CosmeticDef["socket"];
    texKey: AssetKey; cost: number;
    pivot: { x: number; y: number };
    offset?: { dx?: number; dy?: number };
    zBias?: number;
  }>;

  const out: CosmeticDef[] = [];
  for (const it of items) {
    const moduleId = AssetMap[it.texKey];
    out.push({ ...it, tex: resolveModuleId(moduleId) });
  }
  return out;
}
