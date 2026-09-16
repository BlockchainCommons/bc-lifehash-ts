import { FloatGrid } from "./grid";
import type { CellGrid } from "./cell-grid";

/** Each cell's most recent "age" fraction across the generation history. */
export class FracGrid {
  readonly grid: FloatGrid;

  constructor(width: number, height: number) {
    this.grid = new FloatGrid(width, height);
  }

  overlay(cellGrid: CellGrid, frac: number): void {
    const cells = cellGrid.grid.cells;
    const values = this.grid.values;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== 0) values[i] = frac;
    }
  }
}
