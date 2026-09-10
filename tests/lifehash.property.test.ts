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
      fc.property(bytes, version, fc.integer({ min: 2, max: 4 }), (d, v, k) => {
        const [w, h, base] = render("data", hex(d), v);
        const [wk, hk, big] = render("data", hex(d), v, k);
        expect([wk, hk]).toEqual([w * k, h * k]);
        for (let y = 0; y < hk; y++)
          for (let x = 0; x < wk; x++) {
            const s = (((y / k) | 0) * w + ((x / k) | 0)) * 3;
            const t = (y * wk + x) * 3;
            expect(big[t]).toBe(base[s]);
            expect(big[t + 1]).toBe(base[s + 1]);
            expect(big[t + 2]).toBe(base[s + 2]);
          }
        const [, , rgba] = render("data", hex(d), v, 1, true);
        expect(rgba.length).toBe(w * h * 4);
        for (let i = 0; i < w * h; i++) {
          expect(rgba[i * 4]).toBe(base[i * 3]);
          expect(rgba[i * 4 + 1]).toBe(base[i * 3 + 1]);
          expect(rgba[i * 4 + 2]).toBe(base[i * 3 + 2]);
          expect(rgba[i * 4 + 3]).toBe(255);
        }
      }),
      { numRuns: 30 },
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
