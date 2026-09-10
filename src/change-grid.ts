import { BoolGrid } from "./grid";

/** Marks cells whose neighbourhood changed and must be re-evaluated. */
export class ChangeGrid {
  readonly grid: BoolGrid;

  constructor(width: number, height: number) {
    this.grid = new BoolGrid(width, height);
  }

  setChanged(px: number, py: number): void {
    const width = this.grid.width;
    const height = this.grid.height;
    const cells = this.grid.cells;
    for (let oy = -1; oy <= 1; oy++) {
      const ny = (((oy + py) % height) + height) % height;
      for (let ox = -1; ox <= 1; ox++) {
        const nx = (((ox + px) % width) + width) % width;
        cells[ny * width + nx] = 1;
      }
    }
  }
}
