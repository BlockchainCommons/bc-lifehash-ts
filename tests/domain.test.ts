/**
 * Argument-domain snapshot: the outcome of every input only JavaScript can
 * express (wrong types, unknown version names, non-boolean flags, a module
 * size whose image no number can count) and the runtime shape of the
 * exported tables and the error class. Reviewable; a change here is a deliberate API change.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import * as L from "../src";

const describeValue = (e: unknown): string => {
  if (e instanceof Error) {
    const code = (e as { code?: unknown }).code;
    return `throw ${e.name}${typeof code === "string" ? `(${code})` : ""}: ${e.message}`;
  }
  return `throw ${String(e)}`;
};

/** `image WxH chN sha256`, `throw Name(code): message`, or the JSON of a plain value. */
export const outcome = (f: () => unknown): string => {
  try {
    const r = f() as { width?: unknown; colors?: unknown };
    if (r !== null && typeof r === "object" && r.colors instanceof Uint8Array) {
      const i = r as { width: number; height: number; channels: number; colors: Uint8Array };
      const sha = createHash("sha256").update(i.colors).digest("hex").slice(0, 16);
      return `image ${i.width}x${i.height} ch${i.channels} ${sha}`;
    }
    return typeof r === "bigint" ? `${r}n` : (JSON.stringify(r) ?? String(r));
  } catch (e) {
    return describeValue(e);
  }
};

type AnyFn = (...args: unknown[]) => unknown;
const fromUtf8 = L.makeFromUtf8 as unknown as AnyFn;
const fromData = L.makeFromData as unknown as AnyFn;
const fromDigest = L.makeFromDigest as unknown as AnyFn;
const bytes32 = (fill = 0): Uint8Array => new Uint8Array(32).fill(fill);

const rows: Record<string, () => unknown> = {
  'makeFromUtf8("x", { version: "bogus" })': () => fromUtf8("x", { version: "bogus" }),
  'makeFromUtf8("x", { version: "Version2" })': () => fromUtf8("x", { version: "Version2" }),
  'makeFromUtf8("x", { version: 1 })': () => fromUtf8("x", { version: 1 }),
  'makeFromUtf8("x", { version: undefined })': () => fromUtf8("x", { version: undefined }),
  "makeFromUtf8(undefined)": () => fromUtf8(undefined),
  "makeFromUtf8(null)": () => fromUtf8(null),
  "makeFromUtf8(123)": () => fromUtf8(123),
  "makeFromUtf8(new Uint8Array(1))": () => fromUtf8(new Uint8Array(1)),
  'makeFromUtf8("\\ud800") equals makeFromUtf8("\\ufffd")': () =>
    outcome(() => fromUtf8("\ud800")) === outcome(() => fromUtf8("\ufffd")),
  "makeFromData(undefined)": () => fromData(undefined),
  "makeFromData(null)": () => fromData(null),
  'makeFromData("x")': () => fromData("x"),
  "makeFromData(123)": () => fromData(123),
  "makeFromData([1, 2, 3])": () => fromData([1, 2, 3]),
  "makeFromData(new Uint16Array(2))": () => fromData(new Uint16Array(2)),
  'makeFromData(Buffer.from("x")) equals makeFromUtf8("x")': () =>
    outcome(() => fromData(Buffer.from("x"))) === outcome(() => fromUtf8("x")),
  'makeFromUtf8("x", null)': () => fromUtf8("x", null),
  'makeFromUtf8("x", 5)': () => fromUtf8("x", 5),
  'makeFromUtf8("x", { hasAlpha: 1 })': () => fromUtf8("x", { hasAlpha: 1 }),
  'makeFromUtf8("x", { hasAlpha: "yes" })': () => fromUtf8("x", { hasAlpha: "yes" }),
  'makeFromUtf8("x", { hasAlpha: 0 })': () => fromUtf8("x", { hasAlpha: 0 }),
  'makeFromUtf8("x", { hasAlpha: null })': () => fromUtf8("x", { hasAlpha: null }),
  'makeFromUtf8("x", { moduleSize: "2" })': () => fromUtf8("x", { moduleSize: "2" }),
  'makeFromUtf8("x", { moduleSize: 2n })': () => fromUtf8("x", { moduleSize: 2n }),
  'makeFromUtf8("x", { moduleSize: Infinity })': () => fromUtf8("x", { moduleSize: Infinity }),
  'makeFromUtf8("x", { moduleSize: -0 })': () => fromUtf8("x", { moduleSize: -0 }),
  'makeFromUtf8("x", { moduleSize: 2 ** 31 })': () => fromUtf8("x", { moduleSize: 2 ** 31 }),
  'makeFromDigest("x".repeat(32))': () => fromDigest("x".repeat(32)),
  'makeFromDigest("00".repeat(32))': () => fromDigest("00".repeat(32)),
  "makeFromDigest(Array(32).fill(300))": () => fromDigest(Array(32).fill(300)),
  "makeFromDigest(Array(32).fill(44))": () => fromDigest(Array(32).fill(44)),
  'makeFromDigest(Array(32).fill("7"))': () => fromDigest(Array(32).fill("7")),
  "makeFromDigest(Array(32).fill(NaN))": () => fromDigest(Array(32).fill(NaN)),
  "makeFromDigest({ length: 32 })": () => fromDigest({ length: 32 }),
  "makeFromDigest(new ArrayBuffer(32))": () => fromDigest(new ArrayBuffer(32)),
  "makeFromDigest(undefined)": () => fromDigest(undefined),
  "makeFromDigest(new Uint8Array(31))": () => fromDigest(new Uint8Array(31)),
  "makeFromDigest(new Uint8Array(33))": () => fromDigest(new Uint8Array(33)),
  "makeFromDigest(bytes32(9)) equals a subarray view": () =>
    outcome(() => fromDigest(bytes32(9))) ===
    outcome(() => fromDigest(new Uint8Array(40).fill(9).subarray(8))),
  "makeFromDigest(bytes32()) equals Buffer.alloc(32)": () =>
    outcome(() => fromDigest(bytes32())) === outcome(() => fromDigest(Buffer.alloc(32))),
  "Object.isFrozen(LifeHashVersion)": () => Object.isFrozen(L.LifeHashVersion),
  "Object.isFrozen(LifeHashErrorCode)": () => Object.isFrozen(L.LifeHashErrorCode),
  'Object.isFrozen(makeFromUtf8("x"))': () => Object.isFrozen(fromUtf8("x")),
  "colors is a whole ArrayBuffer": () => {
    const i = fromUtf8("x") as { colors: Uint8Array };
    return i.colors.buffer.byteLength === i.colors.length && i.colors.byteOffset === 0;
  },
  "isLifeHashError of a same-shaped error from another copy": () => {
    const e = Object.assign(new Error("m"), { code: "InvalidModuleSize" });
    e.name = "LifeHashError";
    return L.LifeHashError.isLifeHashError(e);
  },
  "error own keys": () => {
    try {
      fromUtf8("x", { moduleSize: 0 });
    } catch (e) {
      return Object.keys(e as object).sort();
    }
    return "no throw";
  },
  exports: () => Object.keys(L).sort(),
};

describe("golden: argument domain", () => {
  it("every JS-only input, the exported tables and the error shape", () => {
    const lines = Object.entries(rows).map(([name, f]) => `${name} → ${outcome(f)}`);
    expect(lines).toMatchSnapshot();
  });
});
