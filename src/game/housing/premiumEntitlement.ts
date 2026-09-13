// TEMPORARY development bypass for Premium Nest Theme entitlement, standing in
// for real App Store / Play Store subscription billing (not implemented in
// this pass -- see the Premium Housing task notes). Every call site that
// needs to know "is the player allowed to equip premiumOnly content" goes
// through isPremiumEntitled() rather than checking DEV_PREMIUM_ENABLED (or
// anything else) directly, so swapping this for a real subscription-status
// check later is a one-function change.
//
// DO NOT ship a release build with DEV_PREMIUM_ENABLED left `true` -- it
// grants every premiumOnly Nest Theme for free. Flip it to `false` to test
// the locked/no-op path (e.g. applyNestTheme silently refusing a premiumOnly
// theme) before billing exists.
export const DEV_PREMIUM_ENABLED = true;

export function isPremiumEntitled(): boolean {
  return DEV_PREMIUM_ENABLED;
}
