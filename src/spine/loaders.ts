import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as THREE from "three";
import {
  TextureAtlas,
  AtlasAttachmentLoader,
  SkeletonJson,
  Skeleton,
  AnimationState,
  AnimationStateData,
} from "@esotericsoftware/spine-core";

/**
 * Loads a Spine skeleton (.json + .atlas + textures) using Expo asset URIs,
 * returns ready-to-use Spine objects and a Three.js texture resolver.
 */
export async function loadSpineFromExpoAssets(opts: {
  atlasModule: number;          // require("assets/spine/glider.atlas")
  jsonModule: number;           // require("assets/spine/glider.json")
  textureModules: number[];     // [require("assets/spine/glider.png"), ...]
  defaultMix?: number;          // optional, e.g. 0.1
}) {
  const { atlasModule, jsonModule, textureModules, defaultMix = 0.08 } = opts;

  // 1) Download assets so we get a localUri on device.
  const atlasAsset = Asset.fromModule(atlasModule);
  const jsonAsset  = Asset.fromModule(jsonModule);
  await Promise.all([atlasAsset.downloadAsync(), jsonAsset.downloadAsync()]);

  const [atlasText, jsonText] = await Promise.all([
    FileSystem.readAsStringAsync(atlasAsset.localUri ?? atlasAsset.uri),
    FileSystem.readAsStringAsync(jsonAsset.localUri ?? jsonAsset.uri),
  ]);

  // 2) Load textures into Three.js
  const pageTextures: Record<string, THREE.Texture> = {};
  const textureAssets = textureModules.map((m) => Asset.fromModule(m));
  await Promise.all(textureAssets.map((a) => a.downloadAsync()));

  // Use filename (page name) as the key; must match names in .atlas
  for (const a of textureAssets) {
  const url = a.localUri ?? a.uri;
  const key = a.name || (url?.split("/").pop() ?? "").toString();

  const tex: THREE.Texture = await new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(url, (t) => resolve(t), undefined, (err) => reject(err));
  });

  // Unified hygiene — CRITICAL lines:
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  // mark as sRGB so sampling is linearized correctly in shader
  // @ts-ignore
  tex.colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
  tex.needsUpdate = true;

  pageTextures[key] = tex;
}
  // 3) Build the Spine data structures
  const atlas = new TextureAtlas(atlasText, (pageName: string) => {
    // Try exact match, else any single page (useful when atlas has one page)
    const tex =
      pageTextures[pageName] ||
      pageTextures[Object.keys(pageTextures)[0]];
    return tex;
  });

  const attachmentLoader = new AtlasAttachmentLoader(atlas);
  const skeletonJson = new SkeletonJson(attachmentLoader);

  // If your JSON uses "scale": set it here, e.g.: skeletonJson.scale = 0.5;
  const skeletonData = skeletonJson.readSkeletonData(JSON.parse(jsonText));

  const skeleton = new Skeleton(skeletonData);
  const stateData = new AnimationStateData(skeletonData);
  stateData.defaultMix = defaultMix;
  const state = new AnimationState(stateData);

  // 4) Provide a resolver for the adapter (uses atlas page names)
  const resolveTexture = (pageOrFileName: string): THREE.Texture | undefined => {
    if (pageTextures[pageOrFileName]) return pageTextures[pageOrFileName];
    // Sometimes the atlas page name contains only the filename (no path)
    const short = pageOrFileName.split("/").pop()!;
    return pageTextures[short];
  };

  return {
    skeleton,
    state,
    stateData,
    atlas,
    pageTextures,
    resolveTexture,
  };
}

/**
 * Convenience: set the first looping animation & optional skin.
 */
export function primeSpinePose(
  skeleton: Skeleton,
  state: AnimationState,
  opts: { animation?: string; skin?: string } = {}
) {
  const { animation = "idle", skin } = opts;
  if (skin) skeleton.setSkinByName(skin);
  skeleton.setToSetupPose();
  state.setAnimation(0, animation, true);
}