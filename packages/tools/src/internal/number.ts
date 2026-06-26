export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const resolvePositiveNumber = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) && value > 0 ? value : fallback;

export const resolveNonNegativeNumber = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) && value >= 0 ? value : fallback;
