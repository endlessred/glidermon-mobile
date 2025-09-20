export type Bounds = { low: number; high: number };
export type Bucket = "LOW" | "IN" | "HIGH";

export function bucketOf(mgdl: number | null | undefined, b: Bounds): Bucket {
  if (mgdl == null) return "IN"; // neutral default
  if (mgdl < b.low) return "LOW";
  if (mgdl > b.high) return "HIGH";
  return "IN";
}
