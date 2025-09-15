// lib/assetResolver.ts
// Keep it simple: Skia's useImage can take Metro's numeric module id on all platforms.
// No need to turn it into a string URI on web.
export type SpriteSource = string | number;

// For now, just return the module id unchanged.
export function resolveModuleId(moduleId: number): SpriteSource {
  return moduleId;
}

// Pass-through
export function resolveSource(src: SpriteSource): SpriteSource {
  return src;
}
