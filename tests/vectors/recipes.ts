/**
 * Vector recipes (Phase 1.1): a recipe names an input and its options;
 * `materialize` renders it through a `VectorApi` and returns one outcome
 * string (`w×h:sha256(pixels)` or `throw:<code>`), so the same recipe
 * drives the golden file, the differential and the Rust harness.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";

export type VersionName = "version1" | "version2" | "detailed" | "fiducial" | "grayscaleFiducial";
export const VERSIONS: readonly VersionName[] = [
  "version1",
  "version2",
  "detailed",
  "fiducial",
  "grayscaleFiducial",
];
export interface Recipe {
  k: "utf8" | "data" | "digest";
  /** UTF-8 text for `utf8`, hex otherwise. */
  s: string;
  version: VersionName;
  moduleSize: number;
  alpha: boolean;
}
export type Outcome = string;

export interface VectorApi {
  /** Returns the image's `[width, height, pixelBytes]`. */
  render(r: Recipe): [number, number, Uint8Array];
  /** The error's code, or undefined for a non-package error. */
  errorCode(e: unknown): string | undefined;
}

export const unhex = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, "hex"));
export const sha256Hex = (u: Uint8Array): string => createHash("sha256").update(u).digest("hex");

export function recipeName(r: Recipe): string {
  const input = r.k === "utf8" ? JSON.stringify(r.s).slice(0, 24) : `${r.k}:${r.s.slice(0, 16)}`;
  return `${r.version} m=${r.moduleSize}${r.alpha ? " rgba" : ""} ${input}`;
}

export function materialize(api: VectorApi, r: Recipe): Outcome {
  try {
    const [w, h, pixels] = api.render(r);
    return `${w}x${h}:${sha256Hex(pixels)}`;
  } catch (e) {
    return `throw:${api.errorCode(e) ?? (e as Error).message}`;
  }
}

/** Pre-redesign surface: numeric `Version` enum, positional parameters. */
export function baselineAdapterFor(m: any): VectorApi {
  const version = (v: VersionName): any =>
    ({
      version1: m.Version.version1,
      version2: m.Version.version2,
      detailed: m.Version.detailed,
      fiducial: m.Version.fiducial,
      grayscaleFiducial: m.Version.grayscale_fiducial,
    })[v];
  return {
    render(r) {
      const img =
        r.k === "utf8"
          ? m.makeFromUtf8(r.s, version(r.version), r.moduleSize, r.alpha)
          : r.k === "data"
            ? m.makeFromData(unhex(r.s), version(r.version), r.moduleSize, r.alpha)
            : m.makeFromDigest(unhex(r.s), version(r.version), r.moduleSize, r.alpha);
      return [img.width, img.height, new Uint8Array(img.colors)];
    },
    errorCode: () => undefined,
  };
}

/**
 * Redesigned surface (Phase 3): `lifehash(input, options)`, string versions.
 * Until Phase 3 lands the working tree still speaks the baseline surface, so
 * the adapter falls back to it.
 */
export function redesignedAdapterFor(m: any): VectorApi {
  if (typeof m.lifehash !== "function") return baselineAdapterFor(m);
  return {
    render(r) {
      const options = { version: r.version, moduleSize: r.moduleSize, alpha: r.alpha };
      const img =
        r.k === "digest"
          ? m.lifehashFromDigest(unhex(r.s), options)
          : m.lifehash(r.k === "utf8" ? r.s : unhex(r.s), options);
      return [img.width, img.height, img.pixels];
    },
    errorCode: (e) => (e as { code?: string }).code,
  };
}
