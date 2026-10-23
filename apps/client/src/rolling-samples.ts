export class RollingSamples {
  private readonly values: Float64Array;
  private next = 0;
  private count = 0;

  constructor(capacity: number) {
    this.values = new Float64Array(capacity);
  }

  add(value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    this.values[this.next] = value;
    this.next = (this.next + 1) % this.values.length;
    this.count = Math.min(this.count + 1, this.values.length);
  }

  p95(): number | null {
    if (this.count === 0) return null;
    const sorted = this.values.slice(0, this.count).sort();
    return sorted[Math.ceil(0.95 * this.count) - 1]!;
  }
}
