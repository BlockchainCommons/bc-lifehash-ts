/** Interpolate `t` from [0..1] to [a..b]. */
export function lerpTo(toA: number, toB: number, t: number): number {
  return t * (toB - toA) + toA;
}

/** Interpolate `t` from [a..b] to [0..1]. */
export function lerpFrom(fromA: number, fromB: number, t: number): number {
  return (fromA - t) / (fromA - fromB);
}

/** Interpolate `t` from [a..b] to [c..d]. */
export function lerp(fromA: number, fromB: number, toC: number, toD: number, t: number): number {
  return lerpTo(toC, toD, lerpFrom(fromA, fromB, t));
}

/** `n` clamped to [0..1]. */
export function clamped(n: number): number {
  return Math.max(Math.min(n, 1), 0);
}

const f32 = new Float32Array(1);
function toF32(x: number): number {
  f32[0] = x;
  return f32[0];
}

/**
 * `dividend` modulo `divisor`, always non-negative. Computed in single
 * precision, as every LifeHash implementation does: the rounding decides
 * which gradient segment a value falls in.
 */
export function modulo(dividend: number, divisor: number): number {
  const d = toF32(divisor);
  const a = toF32(toF32(dividend) % d);
  const b = toF32(a + d) % d;
  return toF32(b);
}

/** An RGB colour with channels in [0..1]. */
export class Color {
  constructor(
    readonly r = 0,
    readonly g = 0,
    readonly b = 0,
  ) {}

  static readonly white: Color = Object.freeze(new Color(1, 1, 1));
  static readonly black: Color = Object.freeze(new Color(0, 0, 0));

  /** A colour from 8-bit channel values. */
  static fromUint8Values(r: number, g: number, b: number): Color {
    return new Color(r / 255, g / 255, b / 255);
  }

  /** Linear interpolation from this colour to `other`. */
  lerpTo(other: Color, t: number): Color {
    const f = clamped(t);
    const red = clamped(this.r * (1 - f) + other.r * f);
    const green = clamped(this.g * (1 - f) + other.g * f);
    const blue = clamped(this.b * (1 - f) + other.b * f);
    return new Color(red, green, blue);
  }

  /** Interpolated towards white. */
  lighten(t: number): Color {
    return this.lerpTo(Color.white, t);
  }

  /** Interpolated towards black. */
  darken(t: number): Color {
    return this.lerpTo(Color.black, t);
  }

  /** A colour-burn towards saturation. */
  burn(t: number): Color {
    const f = Math.max(1.0 - t, 1.0e-7);
    return new Color(
      Math.min(1.0 - (1.0 - this.r) / f, 1.0),
      Math.min(1.0 - (1.0 - this.g) / f, 1.0),
      Math.min(1.0 - (1.0 - this.b) / f, 1.0),
    );
  }

  /**
   * Perceived luminance. The products, squares, sum and square root are
   * computed in single precision, as every LifeHash implementation does:
   * the result orders colours and decides luminance adjustments.
   */
  luminance(): number {
    const r = Math.fround(0.299 * this.r);
    const g = Math.fround(0.587 * this.g);
    const b = Math.fround(0.114 * this.b);
    const r2 = Math.fround(r * r);
    const g2 = Math.fround(g * g);
    const b2 = Math.fround(b * b);
    const sum = Math.fround(Math.fround(r2 + g2) + b2);
    return Math.fround(Math.sqrt(sum));
  }
}
