import { BoolGrid } from "./grid";
import type { Data } from "./data";
import type { ChangeGrid } from "./change-grid";

/** One generation of Conway's Life on a torus, with a change mask to skip settled cells. */
export class CellGrid {
  readonly grid: BoolGrid;

  constructor(width: number, height: number) {
    this.grid = new BoolGrid(width, height);
  }

  /** The cells packed as bits, row-major, most significant bit first. */
  data(): Data {
    const cells = this.grid.cells;
    const out = new Uint8Array(Math.ceil(cells.length / 8));
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== 0) out[i >> 3] |= 0x80 >> (i & 7);
    }
    return out;
  }

  /** Unpacks bits into the cells, row-major, most significant bit first. */
  setData(data: Data): void {
    const cells = this.grid.cells;
    const n = Math.min(cells.length, data.length * 8);
    for (let i = 0; i < n; i++) {
      cells[i] = (data[i >> 3] >> (7 - (i & 7))) & 1;
    }
  }

  nextGeneration(
    currentChangeGrid: ChangeGrid,
    nextCellGrid: CellGrid,
    nextChangeGrid: ChangeGrid,
  ): void {
    const width = this.grid.width;
    const height = this.grid.height;
    const cells = this.grid.cells;
    const changed = currentChangeGrid.grid.cells;
    const next = nextCellGrid.grid.cells;
    next.fill(0);
    nextChangeGrid.grid.fill(false);

    for (let y = 0; y < height; y++) {
      const up = (y === 0 ? height - 1 : y - 1) * width;
      const row = y * width;
      const down = (y === height - 1 ? 0 : y + 1) * width;
      for (let x = 0; x < width; x++) {
        const alive = cells[row + x];
        if (changed[row + x] === 0) {
          next[row + x] = alive;
          continue;
        }
        const left = x === 0 ? width - 1 : x - 1;
        const right = x === width - 1 ? 0 : x + 1;
        const neighbors =
          cells[up + left] +
          cells[up + x] +
          cells[up + right] +
          cells[row + left] +
          cells[row + right] +
          cells[down + left] +
          cells[down + x] +
          cells[down + right];
        const nextAlive = alive !== 0 ? neighbors === 2 || neighbors === 3 : neighbors === 3;
        if (nextAlive) next[row + x] = 1;
        if ((alive !== 0) !== nextAlive) nextChangeGrid.setChanged(x, y);
      }
    }
  }
}
