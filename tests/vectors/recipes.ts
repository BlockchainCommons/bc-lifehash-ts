/**
 * Vector recipes: a recipe names an input and its options; `materialize`
 * renders it through a `VectorApi` and returns one outcome string
 * (`w×h:sha256(pixels)` or `throw:<code>`), so the same recipe drives the
 * golden file, the differential and the Rust harness.
 *
 * A `domain` recipe names a JavaScript-only input (a wrong type, an unknown
 * version name, an oversized module size) from `tests/corpus/domain-cases.ts`;
 * only the current surface can materialise those.
 */
import { createHash } from "node:crypto";
import { DOMAIN_CASES } from "../corpus/domain-cases";

export type VersionName = "version1" | "version2" | "detailed" | "fiducial" | "grayscaleFiducial";
export const VERSIONS: readonly VersionName[] = [
  "version1",
  "version2",
  "detailed",
  "fiducial",
  "grayscaleFiducial",
];

export interface RenderRecipe {
  k: "utf8" | "data" | "digest";
  /** UTF-8 text for `utf8`, hex otherwise. */
  s: string;
  version: VersionName;
  moduleSize: number;
  alpha: boolean;
}
export interface DomainRecipe {
  k: "domain";
  /** A key of `DOMAIN_CASES`. */
  s: string;
}
export type Recipe = RenderRecipe | DomainRecipe;
export type Outcome = string;

export interface VectorApi {
  /** Returns the image's `[width, height, pixelBytes]`. */
  render(r: RenderRecipe): [number, number, Uint8Array];
  /** Runs a domain case against the surface; `undefined` when the surface cannot express it. */
  domain?(name: string): unknown;
  /** The error's code, or undefined for a non-package error. */
  errorCode(e: unknown): string | undefined;
}

export const unhex = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, "hex"));
export const sha256Hex = (u: Uint8Array): string => createHash("sha256").update(u).digest("hex");

export const isBaselineSupported = (r: Recipe): boolean => r.k !== "domain";

export function recipeName(r: Recipe): string {
  if (r.k === "domain") return `domain ${r.s}`;
  const input = r.k === "utf8" ? JSON.stringify(r.s).slice(0, 24) : `${r.k}:${r.s.slice(0, 16)}`;
  return `${r.version} m=${r.moduleSize}${r.alpha ? " rgba" : ""} ${input}`;
}

const imageOutcome = (w: number, h: number, pixels: Uint8Array): Outcome =>
  `${w}x${h}:${sha256Hex(pixels)}`;

const throwOutcome = (api: VectorApi, e: unknown): Outcome => {
  const code = api.errorCode(e);
  if (code !== undefined) return `throw:${code}`;
  // Only the class of a foreign error is recorded: engine messages differ between runtimes.
  return e instanceof Error ? `throw:${e.name}` : `throw:${String(e)}`;
};

export function materialize(api: VectorApi, r: Recipe): Outcome {
  try {
    if (r.k === "domain") {
      if (api.domain === undefined) return "unsupported";
      const v = api.domain(r.s) as { width?: unknown; height?: unknown; pixels?: unknown };
      if (v !== null && typeof v === "object" && v.pixels instanceof Uint8Array) {
        return imageOutcome(v.width as number, v.height as number, v.pixels);
      }
      return `value:${JSON.stringify(v) ?? String(v)}`;
    }
    const [w, h, pixels] = api.render(r);
    return imageOutcome(w, h, pixels);
  } catch (e) {
    return throwOutcome(api, e);
  }
}

/** The frozen pre-1.0.0-beta.1 surface: numeric `Version` enum, positional parameters. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frozenAdapterFor(m: any): VectorApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/** The current surface: `lifehash(input, options)`, string versions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adapterFor(m: any): VectorApi {
  return {
    render(r) {
      const options = { version: r.version, moduleSize: r.moduleSize, alpha: r.alpha };
      const img =
        r.k === "digest"
          ? m.lifehashFromDigest(unhex(r.s), options)
          : m.lifehash(r.k === "utf8" ? r.s : unhex(r.s), options);
      return [img.width, img.height, img.pixels];
    },
    domain(name) {
      const c = DOMAIN_CASES[name];
      if (c === undefined) throw new Error(`unknown domain case ${name}`);
      return c(m);
    },
    errorCode: (e) =>
      e instanceof Error && e.name === "LifeHashError" ? (e as { code?: string }).code : undefined,
  };
}
