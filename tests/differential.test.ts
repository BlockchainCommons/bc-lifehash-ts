/**
 * Differential harness (Phase 1.3): every corpus recipe is rendered with the
 * frozen baseline bundle AND the working tree; pixels (by hash) and error
 * outcomes must be identical outside the enumerated tombstones.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import * as baselineMod from "./baseline/lifehash-baseline.mjs";
import * as src from "../src";
import {
  materialize,
  baselineAdapterFor,
  redesignedAdapterFor,
  recipeName,
  type Recipe,
} from "./vectors/recipes";
import { categories } from "./corpus/corpus";

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_SHA256 = readFileSync(join(here, "baseline/README.md"), "utf8").match(
  /Baseline sha256: ([0-9a-f]{64})/,
)?.[1];

/** Tombstones: the only allowed differences (Phase 3 W4 directive errors). */
const TOMBSTONES: {
  id: string;
  landed: boolean;
  matches: (r: Recipe, baselineOutcome: string, currentOutcome: string) => boolean;
}[] = [
  {
    // A module size that is not a positive integer threw a plain
    // `Error("Invalid module size")` after rendering; it is now a
    // `LifeHashError` with code `InvalidModuleSize`, checked up front.
    id: "T1-invalid-module-size-code",
    landed: true,
    matches: (r, a, b) =>
      (!Number.isInteger(r.moduleSize) || r.moduleSize <= 0) &&
      a === "throw:Invalid module size" &&
      b === "throw:InvalidModuleSize",
  },
  {
    // A digest that is not 32 bytes threw a plain `Error`; it is now a
    // `LifeHashError` with code `InvalidDigestLength`.
    id: "T2-invalid-digest-length-code",
    landed: true,
    matches: (r, a, b) =>
      r.k === "digest" &&
      r.s.length !== 64 &&
      a === "throw:Digest must be 32 bytes" &&
      b === "throw:InvalidDigestLength",
  },
];

const baseline = baselineAdapterFor(baselineMod);
const current = redesignedAdapterFor(src);

describe("differential: baseline vs working tree", () => {
  it("baseline bundle integrity", () => {
    const sha = createHash("sha256")
      .update(readFileSync(join(here, "baseline/lifehash-baseline.mjs")))
      .digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
  for (const [name, gen] of Object.entries(categories)) {
    it(`category ${name}`, { timeout: 600_000 }, () => {
      let n = 0;
      const diffs: string[] = [];
      for (const recipe of gen()) {
        n++;
        const a = materialize(baseline, recipe);
        const b = materialize(current, recipe);
        const tomb = TOMBSTONES.find((t) => t.matches(recipe, a, b));
        if (a !== b && tomb?.landed !== true)
          diffs.push(`${recipeName(recipe)}: ${a.slice(0, 90)} !== ${b.slice(0, 90)}`);
      }
      expect(n).toBeGreaterThan(0);
      expect(diffs).toEqual([]);
    });
  }
});
