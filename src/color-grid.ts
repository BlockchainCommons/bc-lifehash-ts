import type { FracGrid } from "./frac-grid";
import type { ColorFunc } from "./color-func";
import type { Pattern } from "./patterns";

interface Transform {
  transpose: boolean;
  reflectX: boolean;
  reflectY: boolean;
}

const TRANSFORMS: Record<Pattern, readonly Transform[]> = {
  snowflake: [
    { transpose: false, reflectX: false, reflectY: false },
    { transpose: false, reflectX: true, reflectY: false },
    { transpose: false, reflectX: false, reflectY: true },
    { transpose: false, reflectX: true, reflectY: true },
  ],
  pinwheel: [
    { transpose: false, reflectX: false, reflectY: false },
    { transpose: true, reflectX: true, reflectY: false },
    { transpose: true, reflectX: false, reflectY: true },
    { transpose: false, reflectX: true, reflectY: true },
  ],
  fiducial: [{ transpose: false, reflectX: false, reflectY: false }],
};

/** The coloured, symmetry-expanded image as RGB floats in [0, 1]. */
export class ColorGrid {
  readonly width: number;
  readonly height: number;
  /** Three floats per pixel, row-major. */
  readonly colors: Float64Array;

  constructor(fracGrid: FracGrid, gradient: ColorFunc, pattern: Pattern) {
    const multiplier = pattern === "fiducial" ? 1 : 2;
    this.width = fracGrid.grid.width * multiplier;
    this.height = fracGrid.grid.height * multiplier;
    this.colors = new Float64Array(this.width * this.height * 3);
    const maxX = this.width - 1;
    const maxY = this.height - 1;
    const transforms = TRANSFORMS[pattern];
    const fracWidth = fracGrid.grid.width;
    const fracHeight = fracGrid.grid.height;
    for (let y = 0; y < fracHeight; y++) {
      for (let x = 0; x < fracWidth; x++) {
        const color = gradient(fracGrid.grid.get(x, y));
        for (const t of transforms) {
          let px = x;
          let py = y;
          if (t.transpose) [px, py] = [py, px];
          if (t.reflectX) px = maxX - px;
          if (t.reflectY) py = maxY - py;
          const o = (py * this.width + px) * 3;
          this.colors[o] = color.r;
          this.colors[o + 1] = color.g;
          this.colors[o + 2] = color.b;
        }
      }
    }
  }
}
