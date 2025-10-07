import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as THREE from "three";
import { loadAsync } from "expo-three";
import {
  TextureAtlas,
  AtlasAttachmentLoader,
  SkeletonJson,
  Skeleton,
  AnimationState,
  AnimationStateData,
} from "@esotericsoftware/spine-core";

type SpineAssetModule = number | string | Record<string, any> | null | undefined;

async function readModuleAsText(module: SpineAssetModule): Promise<string> {
  if (module == null) {
    throw new Error("Spine asset module is undefined");
  }

  if (typeof module === "number") {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    return FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
  }

  if (typeof module === "string") {
    return module;
  }

  // Metro often auto-parses JSON modules; convert back to string for Spine loader.
  return JSON.stringify(module);
}

export async function loadSpineFromExpoAssets(opts: {
  atlasModule: number;
  jsonModule: SpineAssetModule;
  textureModules: number[];
  defaultMix?: number;
}) {
  const { atlasModule, jsonModule, textureModules, defaultMix = 0.08 } = opts;

  const atlasTextPromise = readModuleAsText(atlasModule);
  const jsonTextPromise = readModuleAsText(jsonModule);

  const [atlasText, jsonText] = await Promise.all([atlasTextPromise, jsonTextPromise]);

  // 2) Load textures into Three.js

  const pageTextures: Record<string, THREE.Texture> = Object.create(null);

  const registerTextureKey = (key: string, texture: THREE.Texture) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    pageTextures[trimmed] = texture;
    const lower = trimmed.toLowerCase();
    if (lower !== trimmed) {
      pageTextures[lower] = texture;
    }
  };

  const registerTextureVariants = (texture: THREE.Texture, raw?: string) => {
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const variants = new Set<string>();
    variants.add(trimmed);

    const slashIndex = trimmed.lastIndexOf('/');
    if (slashIndex >= 0 && slashIndex < trimmed.length - 1) {
      variants.add(trimmed.slice(slashIndex + 1));
    }

    const currentVariants = Array.from(variants);
    for (const variant of currentVariants) {
      const dotIndex = variant.lastIndexOf('.');
      if (dotIndex > 0 && dotIndex < variant.length - 1) {
        const withoutExt = variant.slice(0, dotIndex);
        variants.add(withoutExt);
      } else {
        variants.add(`${variant}.png`);
      }
    }

    for (const variant of variants) {
      registerTextureKey(variant, texture);
    }
  };

  const findTextureForName = (raw: string): THREE.Texture | undefined => {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;

    const candidates = new Set<string>();
    candidates.add(trimmed);
    candidates.add(trimmed.toLowerCase());

    const slashIndex = trimmed.lastIndexOf('/');
    if (slashIndex >= 0 && slashIndex < trimmed.length - 1) {
      const short = trimmed.slice(slashIndex + 1);
      if (short) {
        candidates.add(short);
        candidates.add(short.toLowerCase());
      }
    }

    const variantList = Array.from(candidates);
    for (const variant of variantList) {
      const dotIndex = variant.lastIndexOf('.');
      if (dotIndex > 0 && dotIndex < variant.length - 1) {
        const withoutExt = variant.slice(0, dotIndex);
        if (withoutExt) {
          candidates.add(withoutExt);
          candidates.add(withoutExt.toLowerCase());
        }
      } else {
        const withPng = `${variant}.png`;
        candidates.add(withPng);
        candidates.add(withPng.toLowerCase());
      }
    }

    for (const candidate of candidates) {
      const texture = pageTextures[candidate];
      if (texture) return texture;
    }

    return undefined;
  };

  for (const moduleId of textureModules) {
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();

    const tex = await loadAsync(moduleId);

    // Unified hygiene - critical lines:
    tex.flipY = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    // mark as sRGB so sampling is linearized correctly in shader
    (tex as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
    tex.needsUpdate = true;

    const fileName = (asset.localUri ?? asset.uri)?.split('/').pop();
    registerTextureVariants(tex, asset.name);
    registerTextureVariants(tex, fileName);
    registerTextureVariants(tex, `texture-${moduleId}`);
  }

  const atlas = new TextureAtlas(atlasText);

  atlas.pages.forEach((page) => {
    const matchedTexture =
      findTextureForName(page.name) ||
      findTextureForName(page.name.split('/').pop() ?? '');
        if (matchedTexture) {
      registerTextureVariants(matchedTexture, page.name);
      const current = (page as any).rendererObject ?? {};
      (page as any).rendererObject = { ...current, page, texture: matchedTexture };
    } else if (!(page as any).rendererObject) {
      (page as any).rendererObject = { page };
    }
  });

  atlas.regions.forEach((region) => {
    if (!(region as any).rendererObject) {
      (region as any).rendererObject = { page: region.page };
    }
  });

  const attachmentLoader = new AtlasAttachmentLoader(atlas);
  const skeletonJson = new SkeletonJson(attachmentLoader);

  const skeletonData = skeletonJson.readSkeletonData(JSON.parse(jsonText));

  const skeleton = new Skeleton(skeletonData);
  const stateData = new AnimationStateData(skeletonData);
  stateData.defaultMix = defaultMix;
  const state = new AnimationState(stateData);

  // 4) Provide a resolver for the adapter (uses atlas page names)
  const resolveTexture = (pageOrFileName: string): THREE.Texture | undefined => {
    const texture = findTextureForName(pageOrFileName);
    if (texture) return texture;
    const keys = Object.keys(pageTextures);
    if (keys.length === 0) return undefined;
    return pageTextures[keys[0]];
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

