/**
 * JavaScript-only inputs: values the reference's types cannot express. Each
 * case calls the current surface with one such value; the recipe kind
 * `domain` names a key of this table.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const DOMAIN_CASES: Record<string, (m: any) => unknown> = {
  "version-unknown": (m) => m.lifehash("x", { version: "bogus" }),
  "version-cased": (m) => m.lifehash("x", { version: "Version2" }),
  "version-number": (m) => m.lifehash("x", { version: 1 }),
  "version-undefined": (m) => m.lifehash("x", { version: undefined }),
  "input-undefined": (m) => m.lifehash(undefined),
  "input-null": (m) => m.lifehash(null),
  "input-number": (m) => m.lifehash(123),
  "input-array": (m) => m.lifehash([1, 2, 3]),
  "input-uint16array": (m) => m.lifehash(new Uint16Array(2)),
  "input-buffer": (m) => m.lifehash(Buffer.from("x")),
  "input-lone-surrogate": (m) => m.lifehash("\ud800"),
  "options-null": (m) => m.lifehash("x", null),
  "options-number": (m) => m.lifehash("x", 5),
  "alpha-one": (m) => m.lifehash("x", { alpha: 1 }),
  "alpha-string": (m) => m.lifehash("x", { alpha: "yes" }),
  "alpha-zero": (m) => m.lifehash("x", { alpha: 0 }),
  "alpha-null": (m) => m.lifehash("x", { alpha: null }),
  "moduleSize-string": (m) => m.lifehash("x", { moduleSize: "2" }),
  "moduleSize-bigint": (m) => m.lifehash("x", { moduleSize: 2n }),
  "moduleSize-infinity": (m) => m.lifehash("x", { moduleSize: Infinity }),
  "moduleSize-negative-zero": (m) => m.lifehash("x", { moduleSize: -0 }),
  "moduleSize-2^31": (m) => m.lifehash("x", { moduleSize: 2 ** 31 }),
  "moduleSize-over-ceiling": (m) =>
    m.lifehash("x", { moduleSize: 363, version: "detailed", alpha: true }),
  "digest-string": (m) => m.lifehashFromDigest("x".repeat(32)),
  "digest-hex-string": (m) => m.lifehashFromDigest("00".repeat(32)),
  "digest-array-300": (m) => m.lifehashFromDigest(Array(32).fill(300)),
  "digest-array-44": (m) => m.lifehashFromDigest(Array(32).fill(44)),
  "digest-array-string": (m) => m.lifehashFromDigest(Array(32).fill("7")),
  "digest-array-nan": (m) => m.lifehashFromDigest(Array(32).fill(NaN)),
  "digest-array-like": (m) => m.lifehashFromDigest({ length: 32 }),
  "digest-arraybuffer": (m) => m.lifehashFromDigest(new ArrayBuffer(32)),
  "digest-undefined": (m) => m.lifehashFromDigest(undefined),
  "digest-buffer": (m) => m.lifehashFromDigest(Buffer.alloc(32)),
  "digest-subarray-view": (m) => m.lifehashFromDigest(new Uint8Array(40).fill(9).subarray(8)),
};
