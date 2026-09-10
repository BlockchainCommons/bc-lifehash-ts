/**
 * Round-trip and structure properties (Phase 0.3).
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createHash } from "node:crypto";
import * as src from "../src";
import { redesignedAdapterFor, VERSIONS, type VersionName } from "./vectors/recipes";

const api = redesignedAdapterFor(src);
const sha256 = (d: Uint8Array): Uint8Array =>
  new Uint8Array(createHash("sha256").update(d).digest());
const render = (
  k: "utf8" | "data" | "digest",
  s: string,
  version: VersionName,
  moduleSize = 1,
  alpha = false,
) => api.render({ k, s, version, moduleSize, alpha });
const hex = (u: Uint8Array): string => Buffer.from(u).toString("hex");
const version = fc.constantFrom(...VERSIONS);
const bytes = fc.uint8Array({ minLength: 0, maxLength: 48 });

describe("lifehash properties", () => {
  it("data and digest paths agree: lifehash(d) = lifehashFromDigest(sha256(d))", () => {
    fc.assert(
      fc.property(bytes, version, (d, v) => {
        const [w1, h1, p1] = render("data", hex(d), v);
        const [w2, h2, p2] = render("digest", hex(sha256(d)), v);
        expect([w1, h1]).toEqual([w2, h2]);
        expect(p1).toEqual(p2);
      }),
      { numRuns: 60 },
    );
  });

  it("utf8 is the UTF-8 encoding of the string", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 24 }), version, (s, v) => {
        const [, , p1] = render("utf8", s, v);
        const [, , p2] = render("data", hex(new TextEncoder().encode(s)), v);
        expect(p1).toEqual(p2);
      }),
      { numRuns: 60 },
    );
  });

  it("module size k repeats each pixel k×k; alpha adds a 255 channel", () => {
    fc.assert(
      fc.property(bytes, version, fc.integer({ min: 2, max: 3 }), (d, v, k) => {
        const [w, h, base] = render("data", hex(d), v);
        const [wk, hk, big] = render("data", hex(d), v, k);
        expect([wk, hk]).toEqual([w * k, h * k]);
        const tiled = new Uint8Array(wk * hk * 3);
        for (let y = 0; y < hk; y++)
          for (let x = 0; x < wk; x++) {
            const s = (Math.floor(y / k) * w + Math.floor(x / k)) * 3;
            tiled.set(base.subarray(s, s + 3), (y * wk + x) * 3);
          }
        expect(big).toEqual(tiled);
        const [, , rgba] = render("data", hex(d), v, 1, true);
        const expectedRgba = new Uint8Array(w * h * 4);
        for (let i = 0; i < w * h; i++) {
          expectedRgba.set(base.subarray(i * 3, i * 3 + 3), i * 4);
          expectedRgba[i * 4 + 3] = 255;
        }
        expect(rgba).toEqual(expectedRgba);
      }),
      { numRuns: 20 },
    );
  });

  it("dimensions follow the version: 32 for version1/2, 64 for the rest (fiducials 32)", () => {
    fc.assert(
      fc.property(bytes, version, (d, v) => {
        const [w, h] = render("data", hex(d), v);
        const expected = v === "version1" || v === "version2" ? 32 : v === "detailed" ? 64 : 32;
        expect([w, h]).toEqual([expected, expected]);
      }),
      { numRuns: 30 },
    );
  });
});
