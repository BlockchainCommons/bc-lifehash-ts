/**
 * The vector corpus. Deterministic: a small xorshift stream seeds the random
 * inputs; the `upstream` and `fuzz` categories re-express the two fixture
 * files in `tests/fixtures/` as recipes.
 */
import { readFileSync } from "node:fs";
import { DOMAIN_CASES } from "./domain-cases";
import { VERSIONS, type Recipe, type RenderRecipe, type VersionName } from "../vectors/recipes";

const xorshift = (seed: number): (() => number) => {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };
};
const hexOf = (next: () => number, len: number): string =>
  Array.from({ length: len }, () => (next() & 0xff).toString(16).padStart(2, "0")).join("");

/** Hand-picked inputs: empty, one byte, ASCII, multi-byte UTF-8, edge digests. */
export const HAND_UTF8: readonly string[] = [
  "",
  "a",
  "Hello",
  "Hello, World!",
  "LifeHash",
  "unicode ✓ ☺ 日本",
  "🌈",
];
export const HAND_DATA: readonly string[] = ["", "00", "ff", "0001020304", "deadbeef".repeat(4)];
export const HAND_DIGESTS: readonly string[] = [
  "00".repeat(32),
  "ff".repeat(32),
  "0123456789abcdef".repeat(4),
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // sha256("")
  "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969", // sha256("Hello")
];

const every = (
  inputs: { k: RenderRecipe["k"]; s: string }[],
  sizes: number[],
  alphas: boolean[],
  versions: readonly VersionName[] = VERSIONS,
): RenderRecipe[] => {
  const out: RenderRecipe[] = [];
  for (const { k, s } of inputs)
    for (const version of versions)
      for (const moduleSize of sizes)
        for (const hasAlpha of alphas) out.push({ k, s, version, moduleSize, hasAlpha });
  return out;
};

export function* hand(): Generator<Recipe> {
  yield* every(
    [
      ...HAND_UTF8.map((s) => ({ k: "utf8" as const, s })),
      ...HAND_DATA.map((s) => ({ k: "data" as const, s })),
      ...HAND_DIGESTS.map((s) => ({ k: "digest" as const, s })),
    ],
    [1, 2],
    [false, true],
  );
  // larger tilings, so a big image is compared with the reference too
  yield { k: "utf8", s: "Hello", version: "version2", moduleSize: 32, hasAlpha: false };
  yield { k: "utf8", s: "Hello", version: "detailed", moduleSize: 16, hasAlpha: true };
  // invalid inputs
  yield { k: "digest", s: "00".repeat(31), version: "version2", moduleSize: 1, hasAlpha: false };
  yield { k: "digest", s: "00".repeat(33), version: "version2", moduleSize: 1, hasAlpha: false };
  yield { k: "utf8", s: "x", version: "version2", moduleSize: 0, hasAlpha: false };
  yield { k: "utf8", s: "x", version: "version2", moduleSize: -1, hasAlpha: false };
  yield { k: "utf8", s: "x", version: "version2", moduleSize: 1.5, hasAlpha: false };
}

/** Random inputs of length 0–64, every version, module size 1, both alpha modes. */
export function* generated(): Generator<Recipe> {
  const next = xorshift(0x1f3a5c7e);
  for (let i = 0; i < 400; i++) {
    const len = next() % 65;
    const s = hexOf(next, len);
    for (const version of VERSIONS)
      for (const hasAlpha of [false, true])
        yield { k: "data", s, version, moduleSize: 1, hasAlpha };
  }
  // a few at module size 3
  for (let i = 0; i < 10; i++) {
    const s = hexOf(next, 16);
    for (const version of VERSIONS) yield { k: "data", s, version, moduleSize: 3, hasAlpha: false };
  }
}

/** The fixture files, produced by the reference implementations. */
const fixtures = new URL("../fixtures/", import.meta.url);

export interface UpstreamVector {
  input: string;
  input_type: "utf8" | "hex";
  version: "version1" | "version2" | "detailed" | "fiducial" | "grayscale_fiducial";
  module_size: number;
  has_alpha: boolean;
  width: number;
  height: number;
  colors: number[];
}
export interface FuzzVector {
  input_hex: string;
  version: UpstreamVector["version"];
  module_size: number;
  has_alpha: boolean;
  output_sha256: string;
}

const versionName = (v: UpstreamVector["version"]): VersionName =>
  v === "grayscale_fiducial" ? "grayscaleFiducial" : v;

export const upstreamVectors = (): UpstreamVector[] =>
  JSON.parse(readFileSync(new URL("test-vectors.json", fixtures), "utf8")) as UpstreamVector[];
export const fuzzVectors = (): FuzzVector[] =>
  JSON.parse(readFileSync(new URL("golden.json", fixtures), "utf8")) as FuzzVector[];

export const upstreamRecipe = (v: UpstreamVector): RenderRecipe => ({
  k: v.input_type === "utf8" ? "utf8" : "data",
  s: v.input,
  version: versionName(v.version),
  moduleSize: v.module_size,
  hasAlpha: v.has_alpha,
});
export const fuzzRecipe = (v: FuzzVector): RenderRecipe => ({
  k: "data",
  s: v.input_hex,
  version: versionName(v.version),
  moduleSize: v.module_size,
  hasAlpha: v.has_alpha,
});

/** The 35 vectors of the C++ reference's generator. */
export function* upstream(): Generator<Recipe> {
  for (const v of upstreamVectors()) yield upstreamRecipe(v);
}

/** 1 000 random inputs rendered by the Rust reference. */
export function* fuzz(): Generator<Recipe> {
  for (const v of fuzzVectors()) yield fuzzRecipe(v);
}

/** JavaScript-only inputs (`tests/corpus/domain-cases.ts`). */
export function* domain(): Generator<Recipe> {
  for (const s of Object.keys(DOMAIN_CASES)) yield { k: "domain", s };
}

export const categories: Record<string, () => Generator<Recipe>> = {
  hand,
  generated,
  upstream,
  fuzz,
  domain,
};

/** The golden set: the hand corpus, the first 40 generated inputs, both fixture files, the domain rows. */
export function* goldenRecipes(): Generator<Recipe> {
  yield* hand();
  let i = 0;
  for (const r of generated()) {
    if (i++ >= 400) break;
    yield r;
  }
  yield* upstream();
  yield* fuzz();
  yield* domain();
}
