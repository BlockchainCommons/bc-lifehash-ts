import { describe, it, expect } from "vitest";
import { lifehash, lifehashFromDigest, LifeHashError, LifeHashVersion } from "../src";
import { sha256 } from "@blockchaincommons/crypto";

describe("LifeHash", () => {
  it("should generate correct lifehash from UTF-8 string", () => {
    const image = lifehash("Hello");

    expect(image.width).toBe(32);
    expect(image.height).toBe(32);

    // First 30 bytes of expected output from C++ reference
    const expected = [
      146, 126, 130, 178, 104, 92, 182, 101, 87, 202, 88, 64, 199, 89, 66, 197, 90, 69, 182, 101,
      87, 180, 102, 89, 159, 117, 114, 210, 82, 54,
    ];

    for (let i = 0; i < expected.length; i++) {
      expect(image.pixels[i]).toBe(expected[i]);
    }
  });

  it("should generate correct lifehash with alpha channel", () => {
    const image = lifehash("Hello", { alpha: true });

    expect(image.width).toBe(32);
    expect(image.height).toBe(32);

    // First 40 bytes of expected output from C++ reference (RGBA format)
    const expected = [
      146, 126, 130, 255, 178, 104, 92, 255, 182, 101, 87, 255, 202, 88, 64, 255, 199, 89, 66, 255,
      197, 90, 69, 255, 182, 101, 87, 255, 180, 102, 89, 255, 159, 117, 114, 255, 210, 82, 54, 255,
    ];

    for (let i = 0; i < expected.length; i++) {
      expect(image.pixels[i]).toBe(expected[i]);
    }
  });
});

describe("options and errors", () => {
  it("channels and defaults", () => {
    expect(lifehash("x").channels).toBe(3);
    expect(lifehash("x", { alpha: true }).channels).toBe(4);
    expect(lifehash("x", { version: "detailed" }).width).toBe(64);
    expect(lifehash("x", { moduleSize: 2 }).width).toBe(64);
    expect(lifehash(new TextEncoder().encode("x")).pixels).toEqual(lifehash("x").pixels);
  });

  it("rejects bad module sizes and digests with codes", () => {
    for (const moduleSize of [0, -1, 1.5, NaN]) {
      try {
        lifehash("x", { moduleSize });
        throw new Error("expected a throw");
      } catch (e) {
        expect(LifeHashError.isLifeHashError(e)).toBe(true);
        expect((e as LifeHashError).code).toBe("InvalidModuleSize");
      }
    }
    expect(() => lifehashFromDigest(new Uint8Array(31))).toThrow(LifeHashError);
    try {
      lifehashFromDigest(new Uint8Array(33));
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

  it("rejects an unknown version, a non-object options bag and a non-boolean alpha", () => {
    const codeOf = (f: () => unknown): string | undefined => {
      try {
        f();
        return undefined;
      } catch (e) {
        return LifeHashError.isLifeHashError(e) ? e.code : `not a LifeHashError: ${String(e)}`;
      }
    };
    expect(codeOf(() => lifehash("x", { version: "bogus" as never }))).toBe("InvalidVersion");
    expect(codeOf(() => lifehash("x", null as never))).toBe("InvalidArgument");
    expect(codeOf(() => lifehash("x", { alpha: 1 as never }))).toBe("InvalidArgument");
    expect(codeOf(() => lifehash(123 as never))).toBe("InvalidArgument");
    expect(codeOf(() => lifehashFromDigest("x".repeat(32) as never))).toBe("InvalidArgument");
  });

  it("rejects a module size beyond the output ceiling before allocating", () => {
    expect(lifehash("x", { version: "detailed", moduleSize: 1, alpha: true }).channels).toBe(4);
    let error: unknown;
    try {
      lifehash("x", { version: "detailed", moduleSize: 363, alpha: true });
    } catch (e) {
      error = e;
    }
    expect(LifeHashError.isLifeHashError(error)).toBe(true);
    const e = error as LifeHashError;
    expect(e.code).toBe("InvalidModuleSize");
    expect(e.details.code === "InvalidModuleSize" && e.details.max).toBe(362);
  });

  it("returns a frozen record over a whole buffer", () => {
    const image = lifehash("x");
    expect(Object.isFrozen(image)).toBe(true);
    expect(image.pixels.buffer.byteLength).toBe(image.pixels.length);
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
