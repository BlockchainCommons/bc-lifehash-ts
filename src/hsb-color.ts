import { Color, clamped, modulo } from "./color";

/** A colour in HSB space; only version1 LifeHashes use it. */
export class HSBColor {
  constructor(
    readonly hue: number,
    readonly saturation = 1,
    readonly brightness = 1,
  ) {}

  /** A fully saturated, fully bright colour of the given hue. */
  static fromHue(hue: number): HSBColor {
    return new HSBColor(hue, 1, 1);
  }

  /** The RGB colour. */
  color(): Color {
    const v = clamped(this.brightness);
    const s = clamped(this.saturation);

    if (s <= 0) {
      return new Color(v, v, v);
    }

    let h = modulo(this.hue, 1);
    if (h < 0) {
      h += 1;
    }
    h *= 6;

    // The sextant is chosen from the single-precision value of `h`, as every
    // LifeHash implementation does; a double-precision floor can pick the
    // neighbouring sextant when `h` is just below an integer.
    const i = Math.floor(Math.fround(h));
    const f = h - i;
    const p = v * (1 - s);
    const q = v * (1 - s * f);
    const t = v * (1 - s * (1 - f));

    switch (i) {
      case 0:
        return new Color(v, t, p);
      case 1:
        return new Color(q, v, p);
      case 2:
        return new Color(p, v, t);
      case 3:
        return new Color(p, q, v);
      case 4:
        return new Color(t, p, v);
      case 5:
        return new Color(v, p, q);
      default:
        throw new Error("Internal error in HSB conversion");
    }
  }
}
