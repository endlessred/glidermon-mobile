export const AssetMap = {
  idle8: require("./idle8.png"),
  idle8blink: require("./idle8blink.png"),
  leaf_hat: require("./GliderMonLeafHat.png"),
  greater_hat: require("./GliderMonGreaterHat.png"), // ← NEW
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

