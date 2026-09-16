/**
 * Differential: every corpus recipe is rendered with the frozen bundle of
 * the previous surface AND the working tree; pixels (by hash) and error
 * outcomes must be identical outside the enumerated tombstones. Recipes the
 * frozen surface cannot express (the `domain` rows) are skipped.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import * as frozenMod from "./baseline/lifehash-baseline.mjs";
import * as src from "../src";
import {
  materialize,
  frozenAdapterFor,
  adapterFor,
  recipeName,
  isBaselineSupported,
  type Recipe,
} from "./vectors/recipes";
import { categories } from "./corpus/corpus";

const here = dirname(fileURLToPath(import.meta.url));
const FROZEN_SHA256 = readFileSync(join(here, "baseline/README.md"), "utf8").match(
  /Baseline sha256: ([0-9a-f]{64})/,
)?.[1];

/**
 * Tombstones: the only allowed differences. `rows` pins how many corpus rows
 * each one covers so a tombstone cannot silently widen.
 */
const TOMBSTONES: {
  id: string;
  rows: number;
  matches: (r: Recipe, frozenOutcome: string, currentOutcome: string) => boolean;
}[] = [
  {
    // A module size that is not a positive integer threw a plain
    // `Error("Invalid module size")` after rendering; it is a
    // `LifeHashError` with code `InvalidModuleSize`, checked up front.
    id: "invalid-module-size-code",
    rows: 3,
    matches: (r, a, b) =>
      r.k !== "domain" &&
      (!Number.isInteger(r.moduleSize) || r.moduleSize <= 0) &&
      a === "throw:Error" &&
      b === "throw:InvalidModuleSize",
  },
  {
    // A digest that is not 32 bytes threw a plain `Error`; it is a
    // `LifeHashError` with code `InvalidDigestLength`.
    id: "invalid-digest-length-code",
    rows: 2,
    matches: (r, a, b) =>
      r.k === "digest" &&
      r.s.length !== 64 &&
      a === "throw:Error" &&
      b === "throw:InvalidDigestLength",
  },
];

const frozen = frozenAdapterFor(frozenMod);
const current = adapterFor(src);

describe("differential: frozen surface vs working tree", () => {
  it("frozen bundle integrity", () => {
    const sha = createHash("sha256")
      .update(readFileSync(join(here, "baseline/lifehash-baseline.mjs")))
      .digest("hex");
    expect(sha).toBe(FROZEN_SHA256);
  });
  const hits = new Map<string, number>();
  for (const [name, gen] of Object.entries(categories)) {
    it(`category ${name}`, { timeout: 600_000 }, () => {
      let n = 0;
      const diffs: string[] = [];
      for (const recipe of gen()) {
        if (!isBaselineSupported(recipe)) continue;
        n++;
        const a = materialize(frozen, recipe);
        const b = materialize(current, recipe);
        if (a === b) continue;
        const tomb = TOMBSTONES.find((t) => t.matches(recipe, a, b));
        if (tomb === undefined) {
          diffs.push(`${recipeName(recipe)}: ${a.slice(0, 90)} !== ${b.slice(0, 90)}`);
        } else {
          hits.set(tomb.id, (hits.get(tomb.id) ?? 0) + 1);
        }
      }
      if (name !== "domain") expect(n).toBeGreaterThan(0);
      expect(diffs).toEqual([]);
    });
  }
  it("every tombstone covers exactly the rows it pins", () => {
    for (const t of TOMBSTONES) expect(hits.get(t.id) ?? 0, t.id).toBe(t.rows);
  });
});
