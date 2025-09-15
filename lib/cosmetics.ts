import { Platform } from "react-native";
import { Asset } from "expo-asset";
import cosmeticsJson from "../assets/cosmetics.json";
import { AssetMap, AssetKey } from "../assets/assetMap";

export type SpriteSource = string | number;

export type CosmeticDef = {
  id: string;
  name: string;
  socket: string;                // e.g., "headTop"
  tex: SpriteSource;             // module id (native) or uri (web)
  pivot: { x: number; y: number };
  offset?: { dx?: number; dy?: number };
  zBias?: number;
};

export async function loadCosmetics(): Promise<CosmeticDef[]> {
  const items = (cosmeticsJson as any).items as Array<{
    id: string; name: string; socket: string; texKey: AssetKey;
    pivot: { x: number; y: number };
    offset?: { dx?: number; dy?: number };
    zBias?: number;
  }>;

  const out: CosmeticDef[] = [];
  for (const it of items) {
    const moduleId = AssetMap[it.texKey];
    if (Platform.OS === "web") {
      const a = Asset.fromModule(moduleId);
      if (!a.downloaded) { try { await a.downloadAsync(); } catch {} }
      out.push({ ...it, tex: a.localUri ?? a.uri });
    } else {
      out.push({ ...it, tex: moduleId });
    }
  }
  return out;
}
