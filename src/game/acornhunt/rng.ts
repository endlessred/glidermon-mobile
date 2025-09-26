// Seeded RNG system for Acorn Hunt
// Uses a simple Linear Congruential Generator for deterministic results

export class SeededRNG {
  private seed: number;
  private current: number;

  constructor(seed: number) {
    this.seed = seed;
    this.current = seed;
  }

  // Generate next random number between 0 and 1
  next(): number {
    // LCG formula: (a * x + c) % m
    // Using common values: a = 1664525, c = 1013904223, m = 2^32
    this.current = (this.current * 1664525 + 1013904223) % 0x100000000;
    return this.current / 0x100000000;
  }

  // Generate random integer between min and max (inclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Generate random float between min and max
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Choose random element from array
  choose<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  // Shuffle array in place using Fisher-Yates algorithm
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Weighted random choice
  weightedChoose<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
      throw new Error("Items and weights arrays must have same length");
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = this.next() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1]; // Fallback
  }

  // Reset to original seed
  reset(): void {
    this.current = this.seed;
  }

  // Get current seed for reproduction
  getSeed(): number {
    return this.seed;
  }
}