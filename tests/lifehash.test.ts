import { describe, it, expect } from "vitest";
import { makeFromData, makeFromDigest, makeFromUtf8, LifeHashError, LifeHashVersion } from "../src";
import { sha256 } from "@noble/hashes/sha2.js";

/** The `LifeHashError` code `f` throws, `undefined` when it returns, or a note for a foreign error. */
const codeOf = (f: () => unknown): string | undefined => {
  try {
    f();
    return undefined;
  } catch (e) {
    return LifeHashError.isLifeHashError(e) ? e.code : `not a LifeHashError: ${String(e)}`;
  }
};

describe("LifeHash", () => {
  it("should generate correct lifehash from UTF-8 string", () => {
    const image = makeFromUtf8("Hello");

    expect(image.width).toBe(32);
    expect(image.height).toBe(32);

    // First 30 bytes of expected output from C++ reference
    const expected = [
      146, 126, 130, 178, 104, 92, 182, 101, 87, 202, 88, 64, 199, 89, 66, 197, 90, 69, 182, 101,
      87, 180, 102, 89, 159, 117, 114, 210, 82, 54,
    ];

    for (let i = 0; i < expected.length; i++) {
      expect(image.colors[i]).toBe(expected[i]);
    }
  });

  it("should generate correct lifehash with alpha channel", () => {
    const image = makeFromUtf8("Hello", { hasAlpha: true });

    expect(image.width).toBe(32);
    expect(image.height).toBe(32);

    // First 40 bytes of expected output from C++ reference (RGBA format)
    const expected = [
      146, 126, 130, 255, 178, 104, 92, 255, 182, 101, 87, 255, 202, 88, 64, 255, 199, 89, 66, 255,
      197, 90, 69, 255, 182, 101, 87, 255, 180, 102, 89, 255, 159, 117, 114, 255, 210, 82, 54, 255,
    ];

    for (let i = 0; i < expected.length; i++) {
      expect(image.colors[i]).toBe(expected[i]);
    }
  });
});

describe("options and errors", () => {
  it("channels and defaults", () => {
    expect(makeFromUtf8("x").channels).toBe(3);
    expect(makeFromUtf8("x", { hasAlpha: true }).channels).toBe(4);
    expect(makeFromUtf8("x", { version: "detailed" }).width).toBe(64);
    expect(makeFromUtf8("x", { moduleSize: 2 }).width).toBe(64);
    expect(makeFromData(new TextEncoder().encode("x")).colors).toEqual(makeFromUtf8("x").colors);
    expect(makeFromDigest(sha256(new TextEncoder().encode("x"))).colors).toEqual(
      makeFromUtf8("x").colors,
    );
  });

  it("rejects bad module sizes and digests with codes", () => {
    for (const moduleSize of [0, -1, 1.5, NaN]) {
      try {
        makeFromUtf8("x", { moduleSize });
        throw new Error("expected a throw");
      } catch (e) {
        expect(LifeHashError.isLifeHashError(e)).toBe(true);
        expect((e as LifeHashError).code).toBe("InvalidModuleSize");
      }
    }
    expect(() => makeFromDigest(new Uint8Array(31))).toThrow(LifeHashError);
    try {
      makeFromDigest(new Uint8Array(33));
    } catch (e) {
      expect((e as LifeHashError).code).toBe("InvalidDigestLength");
    }
  });

  it("version names, in order", () => {
    expect(Object.values(LifeHashVersion)).toEqual([
      "version1",
      "version2",
      "detailed",
      "fiducial",
      "grayscaleFiducial",
    ]);
    expect(Object.isFrozen(LifeHashVersion)).toBe(true);
  });

  it("rejects an unknown version, a non-object options bag, a non-boolean hasAlpha and mistyped data", () => {
    expect(codeOf(() => makeFromUtf8("x", { version: "bogus" as never }))).toBe("InvalidVersion");
    expect(codeOf(() => makeFromUtf8("x", null as never))).toBe("InvalidArgument");
    expect(codeOf(() => makeFromUtf8("x", { hasAlpha: 1 as never }))).toBe("InvalidArgument");
    expect(codeOf(() => makeFromUtf8(123 as never))).toBe("InvalidArgument");
    expect(codeOf(() => makeFromUtf8(new Uint8Array(1) as never))).toBe("InvalidArgument");
    expect(codeOf(() => makeFromData("x" as never))).toBe("InvalidArgument");
    expect(codeOf(() => makeFromDigest("x".repeat(32) as never))).toBe("InvalidArgument");
  });

  it("checks the data argument before the options", () => {
    expect(codeOf(() => makeFromDigest(new Uint8Array(31), { moduleSize: 0 }))).toBe(
      "InvalidDigestLength",
    );
    expect(codeOf(() => makeFromDigest("x" as never, { version: "bogus" as never }))).toBe(
      "InvalidArgument",
    );
    expect(codeOf(() => makeFromData(123 as never, { moduleSize: 0 }))).toBe("InvalidArgument");
    expect(codeOf(() => makeFromUtf8(123 as never, { moduleSize: 0 }))).toBe("InvalidArgument");
    expect(codeOf(() => makeFromUtf8("x", { moduleSize: 0 }))).toBe("InvalidModuleSize");
  });

  it("rejects a module size whose image no number can count, before allocating", () => {
    // The largest module size whose image holds at most 2 ** 53 - 1 bytes.
    const cases: [LifeHashVersion, boolean, number][] = [
      ["version2", false, 1_712_317],
      ["version2", true, 1_482_910],
      ["detailed", false, 856_158],
      ["detailed", true, 741_455],
    ];
    for (const [version, hasAlpha, max] of cases) {
      let error: unknown;
      try {
        makeFromUtf8("x", { version, moduleSize: max + 1, hasAlpha });
      } catch (e) {
        error = e;
      }
      expect(LifeHashError.isLifeHashError(error)).toBe(true);
      const e = error as LifeHashError;
      expect(e.code).toBe("InvalidModuleSize");
      expect(e.details.code === "InvalidModuleSize" && e.details.max).toBe(max);
      expect(e.message).toContain(`at most ${max}`);
    }
  });

  it("returns a frozen record over a whole buffer", () => {
    const image = makeFromUtf8("x");
    expect(Object.isFrozen(image)).toBe(true);
    expect(image.colors.buffer.byteLength).toBe(image.colors.length);
  });
});

describe("SHA-256", () => {
  it("should produce correct digest for 'Hello'", () => {
    const data = new TextEncoder().encode("Hello");
    const digest = sha256(data);
    expect(Buffer.from(digest).toString("hex")).toBe(
      "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969",
    );
  });
});
