/**
 * Golden vector suite: the committed record of every recipe's outcome
 * (dimensions and pixel hash, or the error code). Changes only through
 * `bun run vectors:generate`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import * as src from "../src";
import { materialize, adapterFor, type Recipe, type Outcome } from "./vectors/recipes";

const here = dirname(fileURLToPath(import.meta.url));
const { count, vectors } = JSON.parse(readFileSync(join(here, "vectors/vectors.json"), "utf8")) as {
  count: number;
  vectors: { name: string; recipe: Recipe; expect: Outcome }[];
};
const api = adapterFor(src);

describe("golden vectors", () => {
  it("fixture is self-consistent and non-trivial", () => {
    expect(vectors.length).toBe(count);
    expect(vectors.length).toBeGreaterThanOrEqual(1700);
  });
  vectors.forEach((v, i) => {
    it(`#${i} ${v.name}`, () => {
      expect(materialize(api, v.recipe)).toBe(v.expect);
    });
  });
});
