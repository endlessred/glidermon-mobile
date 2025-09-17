export const AssetMap = {
  idle8: require("./idle8.png"),
  idle8blink: require("./idle8blink.png"),
  leaf_hat: require("./GliderMonLeafHat.png"),
  greater_hat: require("./GliderMonGreaterHat.png"), // ← NEW
} as const;

export type AssetKey = keyof typeof AssetMap;

