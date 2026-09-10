import { describe, it, expect } from "vitest";
import {
  lifehash,
  lifehashFromDigest,
  LifeHashError,
  lifehashVersionCode,
  lifehashVersionFromCode,
} from "../src";
import { dataToHex, hexToData } from "../src/hex";
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

  it("version codes", () => {
    expect(lifehashVersionCode("version1")).toBe(0);
    expect(lifehashVersionCode("grayscaleFiducial")).toBe(4);
    expect(lifehashVersionFromCode(2)).toBe("detailed");
    expect(lifehashVersionFromCode(9)).toBeUndefined();
  });
});

describe("Hex utilities", () => {
  it("should convert data to hex string", () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff]);
    expect(dataToHex(data)).toBe("00010203ff");
  });

  it("should convert hex string to data", () => {
    const result = hexToData("00010203ff");
    const expected = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff]);
    expect(result).toEqual(expected);
  });
});

describe("SHA-256", () => {
  it("should produce correct digest for 'Hello'", () => {
    const data = new TextEncoder().encode("Hello");
    const digest = sha256(data);
    const hex = dataToHex(digest);
    expect(hex).toBe("185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969");
  });
});
