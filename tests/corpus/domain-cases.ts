/**
 * JavaScript-only inputs: values the reference's types cannot express, and
 * one module size whose image no `number` can count. Each case calls the
 * current surface with one such value; the recipe kind `domain` names a key
 * of this table.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const DOMAIN_CASES: Record<string, (m: any) => unknown> = {
  "version-unknown": (m) => m.makeFromUtf8("x", { version: "bogus" }),
  "version-cased": (m) => m.makeFromUtf8("x", { version: "Version2" }),
  "version-number": (m) => m.makeFromUtf8("x", { version: 1 }),
  "version-undefined": (m) => m.makeFromUtf8("x", { version: undefined }),
  "text-undefined": (m) => m.makeFromUtf8(undefined),
  "text-null": (m) => m.makeFromUtf8(null),
  "text-number": (m) => m.makeFromUtf8(123),
  "text-bytes": (m) => m.makeFromUtf8(new Uint8Array(1)),
  "text-lone-surrogate": (m) => m.makeFromUtf8("\ud800"),
  "data-undefined": (m) => m.makeFromData(undefined),
  "data-null": (m) => m.makeFromData(null),
  "data-string": (m) => m.makeFromData("x"),
  "data-number": (m) => m.makeFromData(123),
  "data-array": (m) => m.makeFromData([1, 2, 3]),
  "data-uint16array": (m) => m.makeFromData(new Uint16Array(2)),
  "data-buffer": (m) => m.makeFromData(Buffer.from("x")),
  "options-null": (m) => m.makeFromUtf8("x", null),
  "options-number": (m) => m.makeFromUtf8("x", 5),
  "hasAlpha-one": (m) => m.makeFromUtf8("x", { hasAlpha: 1 }),
  "hasAlpha-string": (m) => m.makeFromUtf8("x", { hasAlpha: "yes" }),
  "hasAlpha-zero": (m) => m.makeFromUtf8("x", { hasAlpha: 0 }),
  "hasAlpha-null": (m) => m.makeFromUtf8("x", { hasAlpha: null }),
  "moduleSize-string": (m) => m.makeFromUtf8("x", { moduleSize: "2" }),
  "moduleSize-bigint": (m) => m.makeFromUtf8("x", { moduleSize: 2n }),
  "moduleSize-infinity": (m) => m.makeFromUtf8("x", { moduleSize: Infinity }),
  "moduleSize-negative-zero": (m) => m.makeFromUtf8("x", { moduleSize: -0 }),
  "moduleSize-2^31": (m) => m.makeFromUtf8("x", { moduleSize: 2 ** 31 }),
  "digest-string": (m) => m.makeFromDigest("x".repeat(32)),
  "digest-hex-string": (m) => m.makeFromDigest("00".repeat(32)),
  "digest-array-300": (m) => m.makeFromDigest(Array(32).fill(300)),
  "digest-array-44": (m) => m.makeFromDigest(Array(32).fill(44)),
  "digest-array-string": (m) => m.makeFromDigest(Array(32).fill("7")),
  "digest-array-nan": (m) => m.makeFromDigest(Array(32).fill(NaN)),
  "digest-array-like": (m) => m.makeFromDigest({ length: 32 }),
  "digest-arraybuffer": (m) => m.makeFromDigest(new ArrayBuffer(32)),
  "digest-undefined": (m) => m.makeFromDigest(undefined),
  "digest-buffer": (m) => m.makeFromDigest(Buffer.alloc(32)),
  "digest-subarray-view": (m) => m.makeFromDigest(new Uint8Array(40).fill(9).subarray(8)),
};
