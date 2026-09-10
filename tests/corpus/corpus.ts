/**
 * Differential corpus (Phase 1.3) and the golden subset (Phase 1.2).
 * Deterministic: a small xorshift stream seeds the random inputs.
 */
import { VERSIONS, type Recipe, type VersionName } from "../vectors/recipes";

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
  inputs: { k: Recipe["k"]; s: string }[],
  sizes: number[],
  alphas: boolean[],
  versions: readonly VersionName[] = VERSIONS,
): Recipe[] => {
  const out: Recipe[] = [];
  for (const { k, s } of inputs)
    for (const version of versions)
      for (const moduleSize of sizes)
        for (const alpha of alphas) out.push({ k, s, version, moduleSize, alpha });
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
  // invalid inputs
  yield { k: "digest", s: "00".repeat(31), version: "version2", moduleSize: 1, alpha: false };
  yield { k: "digest", s: "00".repeat(33), version: "version2", moduleSize: 1, alpha: false };
  yield { k: "utf8", s: "x", version: "version2", moduleSize: 0, alpha: false };
  yield { k: "utf8", s: "x", version: "version2", moduleSize: -1, alpha: false };
  yield { k: "utf8", s: "x", version: "version2", moduleSize: 1.5, alpha: false };
}

/** Random inputs of length 0–64, every version, module size 1, both alpha modes. */
export function* generated(): Generator<Recipe> {
  const next = xorshift(0x1f3a5c7e);
  for (let i = 0; i < 400; i++) {
    const len = next() % 65;
    const s = hexOf(next, len);
    for (const version of VERSIONS)
      for (const alpha of [false, true]) yield { k: "data", s, version, moduleSize: 1, alpha };
  }
  // a few at module size 3
  for (let i = 0; i < 10; i++) {
    const s = hexOf(next, 16);
    for (const version of VERSIONS) yield { k: "data", s, version, moduleSize: 3, alpha: false };
  }
}

export const categories: Record<string, () => Generator<Recipe>> = { hand, generated };

/** The golden subset: the hand corpus plus the first 40 generated inputs. */
export function* goldenRecipes(): Generator<Recipe> {
  yield* hand();
  let i = 0;
  for (const r of generated()) {
    if (i++ >= 400) break;
    yield r;
  }
}
