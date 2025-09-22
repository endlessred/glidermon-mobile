export const AssetMap = {
  // Character sprites (new palette-based versions)
  idle8: require("./glidermonnew/idle8_new.png"),
  idle8blink: require("./glidermonnew/idle8_new_blink.png"),
  glidermonpalette: require("./glidermonnew/glidermonpalette.png"),

  // Legacy character sprites (keep for compatibility)
  idle8_legacy: require("./idle8.png"),
  idle8blink_legacy: require("./idle8blink.png"),

  // Hat cosmetics
  leaf_hat: require("./GliderMonLeafHat.png"),
  greater_hat: require("./GliderMonGreaterHat.png"),
  hat_pack_1: require("./hats/hat_pack_1.png"),

  // Individual hat pack frames
  frog_hat: require("./hats/hat_pack_1.png"),
  black_headphones: require("./hats/hat_pack_1.png"),
  white_headphones: require("./hats/hat_pack_1.png"),
  pink_headphones: require("./hats/hat_pack_1.png"),
  pink_aniphones: require("./hats/hat_pack_1.png"),
  feather_cap: require("./hats/hat_pack_1.png"),
  viking_hat: require("./hats/hat_pack_1.png"),
  adventurer_fedora: require("./hats/hat_pack_1.png"),
} as const;

export type AssetKey = keyof typeof AssetMap;

