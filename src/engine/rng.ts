// Deterministic daily RNG (so drops feel fair, no “bad luck streaks”)
export function seedFrom(userId: string, day: string){
  // xorshift-ish hash
  let h = 2166136261 >>> 0;
  const s = userId + '|' + day;
  for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function makeRng(seed: number){
  let x = seed || 123456789;
  return () => {
    // xorshift32
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    // 0..1
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}
