/**
 * Fixed-size grids over typed arrays, addressed row-major with toroidal
 * wrap-around for neighbourhoods.
 */

/** A grid of booleans stored one byte per cell. */
export class BoolGrid {
  readonly cells: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.cells = new Uint8Array(width * height);
  }

  fill(value: boolean): void {
    this.cells.fill(value ? 1 : 0);
  }
}

/** A grid of floats. */
export class FloatGrid {
  readonly values: Float64Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.values = new Float64Array(width * height);
  }

  get(x: number, y: number): number {
    return this.values[y * this.width + x];
  }
}
