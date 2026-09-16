/**
 * Argument-domain snapshot: the outcome of every input only JavaScript can
 * express (wrong types, unknown version names, non-boolean flags, an
 * oversized module size) and the runtime shape of the exported tables and
 * the error class. Reviewable; a change here is a deliberate API change.
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
    const r = f() as { width?: unknown; pixels?: unknown };
    if (r !== null && typeof r === "object" && r.pixels instanceof Uint8Array) {
      const i = r as { width: number; height: number; channels: number; pixels: Uint8Array };
      const sha = createHash("sha256").update(i.pixels).digest("hex").slice(0, 16);
      return `image ${i.width}x${i.height} ch${i.channels} ${sha}`;
    }
    return typeof r === "bigint" ? `${r}n` : (JSON.stringify(r) ?? String(r));
  } catch (e) {
    return describeValue(e);
  }
};

type AnyFn = (...args: unknown[]) => unknown;
const lifehash = L.lifehash as unknown as AnyFn;
const fromDigest = L.lifehashFromDigest as unknown as AnyFn;
const bytes32 = (fill = 0): Uint8Array => new Uint8Array(32).fill(fill);

const rows: Record<string, () => unknown> = {
  'lifehash("x", { version: "bogus" })': () => lifehash("x", { version: "bogus" }),
  'lifehash("x", { version: "Version2" })': () => lifehash("x", { version: "Version2" }),
  'lifehash("x", { version: 1 })': () => lifehash("x", { version: 1 }),
  'lifehash("x", { version: undefined })': () => lifehash("x", { version: undefined }),
  "lifehash(undefined)": () => lifehash(undefined),
  "lifehash(null)": () => lifehash(null),
  "lifehash(123)": () => lifehash(123),
  "lifehash([1, 2, 3])": () => lifehash([1, 2, 3]),
  "lifehash(new Uint16Array(2))": () => lifehash(new Uint16Array(2)),
  'lifehash(Buffer.from("x")) equals lifehash("x")': () =>
    outcome(() => lifehash(Buffer.from("x"))) === outcome(() => lifehash("x")),
  'lifehash("x", null)': () => lifehash("x", null),
  'lifehash("x", 5)': () => lifehash("x", 5),
  'lifehash("x", { alpha: 1 })': () => lifehash("x", { alpha: 1 }),
  'lifehash("x", { alpha: "yes" })': () => lifehash("x", { alpha: "yes" }),
  'lifehash("x", { alpha: 0 })': () => lifehash("x", { alpha: 0 }),
  'lifehash("x", { alpha: null })': () => lifehash("x", { alpha: null }),
  'lifehash("x", { moduleSize: "2" })': () => lifehash("x", { moduleSize: "2" }),
  'lifehash("x", { moduleSize: 2n })': () => lifehash("x", { moduleSize: 2n }),
  'lifehash("x", { moduleSize: Infinity })': () => lifehash("x", { moduleSize: Infinity }),
  'lifehash("x", { moduleSize: -0 })': () => lifehash("x", { moduleSize: -0 }),
  'lifehash("x", { moduleSize: 2 ** 31 })': () => lifehash("x", { moduleSize: 2 ** 31 }),
  'lifehash("x", { moduleSize: 363, version: "detailed", alpha: true })': () =>
    lifehash("x", { moduleSize: 363, version: "detailed", alpha: true }),
  'lifehashFromDigest("x".repeat(32))': () => fromDigest("x".repeat(32)),
  'lifehashFromDigest("00".repeat(32))': () => fromDigest("00".repeat(32)),
  "lifehashFromDigest(Array(32).fill(300))": () => fromDigest(Array(32).fill(300)),
  "lifehashFromDigest(Array(32).fill(44))": () => fromDigest(Array(32).fill(44)),
  'lifehashFromDigest(Array(32).fill("7"))': () => fromDigest(Array(32).fill("7")),
  "lifehashFromDigest(Array(32).fill(NaN))": () => fromDigest(Array(32).fill(NaN)),
  "lifehashFromDigest({ length: 32 })": () => fromDigest({ length: 32 }),
  "lifehashFromDigest(new ArrayBuffer(32))": () => fromDigest(new ArrayBuffer(32)),
  "lifehashFromDigest(undefined)": () => fromDigest(undefined),
  "lifehashFromDigest(new Uint8Array(31))": () => fromDigest(new Uint8Array(31)),
  "lifehashFromDigest(new Uint8Array(33))": () => fromDigest(new Uint8Array(33)),
  "lifehashFromDigest(bytes32(9)) equals a subarray view": () =>
    outcome(() => fromDigest(bytes32(9))) ===
    outcome(() => fromDigest(new Uint8Array(40).fill(9).subarray(8))),
  "lifehashFromDigest(bytes32()) equals Buffer.alloc(32)": () =>
    outcome(() => fromDigest(bytes32())) === outcome(() => fromDigest(Buffer.alloc(32))),
  'lifehash("\\ud800") equals lifehash("\\ufffd")': () =>
    outcome(() => lifehash("\ud800")) === outcome(() => lifehash("�")),
  "Object.isFrozen(LifeHashVersion)": () => Object.isFrozen(L.LifeHashVersion),
  "Object.isFrozen(LifeHashErrorCode)": () => Object.isFrozen(L.LifeHashErrorCode),
  'Object.isFrozen(lifehash("x"))': () => Object.isFrozen(lifehash("x")),
  "pixels is a whole ArrayBuffer": () => {
    const i = lifehash("x") as { pixels: Uint8Array };
    return i.pixels.buffer.byteLength === i.pixels.length && i.pixels.byteOffset === 0;
  },
  "isLifeHashError of a same-shaped error from another copy": () => {
    const e = Object.assign(new Error("m"), { code: "InvalidModuleSize" });
    e.name = "LifeHashError";
    return L.LifeHashError.isLifeHashError(e);
  },
  "error own keys": () => {
    try {
      lifehash("x", { moduleSize: 0 });
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
