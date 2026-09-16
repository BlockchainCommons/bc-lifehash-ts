/**
 * Golden vector generator. `bun scripts/generate-vectors.ts`.
 *
 * Materialises the golden recipes with the WORKING TREE and writes
 * tests/vectors/vectors.json. Regenerating is a deliberate, reviewed act: the
 * diff is the record of every behavioural change.
 *
 * Hard-fails (exit 1) if the working tree disagrees with either fixture file:
 * every upstream vector must reproduce its pixels byte for byte, and every
 * fuzz vector must reproduce the SHA-256 the Rust reference recorded.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as src from "../src/index.ts";
import { adapterFor, materialize, recipeName, sha256Hex } from "../tests/vectors/recipes.ts";
import {
  fuzzRecipe,
  fuzzVectors,
  goldenRecipes,
  upstreamRecipe,
  upstreamVectors,
} from "../tests/corpus/corpus.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const api = adapterFor(src);

let failed = 0;
for (const [i, v] of upstreamVectors().entries()) {
  const [w, h, pixels] = api.render(upstreamRecipe(v));
  const expected = Uint8Array.from(v.colors);
  if (w !== v.width || h !== v.height || Buffer.compare(pixels, expected) !== 0) {
    failed++;
    console.error(`upstream #${i} (${v.version} ${v.input_type}:${JSON.stringify(v.input)}) differs`);
  }
}
for (const [i, v] of fuzzVectors().entries()) {
  const [, , pixels] = api.render(fuzzRecipe(v));
  if (sha256Hex(pixels) !== v.output_sha256) {
    failed++;
    console.error(`fuzz #${i} (${v.version} ${v.input_hex.slice(0, 16)}…) differs`);
  }
}
if (failed > 0) {
  console.error(`${failed} fixture vector(s) do not reproduce; vectors.json not written.`);
  process.exit(1);
}

const vectors = [];
for (const recipe of goldenRecipes()) {
  vectors.push({ name: recipeName(recipe), recipe, expect: materialize(api, recipe) });
}
writeFileSync(
  join(root, "tests/vectors/vectors.json"),
  `${JSON.stringify({ count: vectors.length, vectors }, null, 1)}\n`,
);
console.log(`wrote ${vectors.length} vectors from the working tree (fixtures reproduced)`);
