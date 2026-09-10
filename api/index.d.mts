//#region src/version.d.ts
/**
 * LifeHash versions. `version2` is the default; `version1` is kept for
 * images made before the CMYK-friendly gamut existed.
 */
declare const LifeHashVersion: {
  /** The original HSB gamut (deprecated). */
  readonly version1: "version1";
  /** The recommended default: CMYK-friendly gamut. */
  readonly version2: "version2";
  /** Double resolution, CMYK-friendly gamut. */
  readonly detailed: "detailed";
  /** High contrast, optimised for machine-vision fiducials. */
  readonly fiducial: "fiducial";
  /** Grayscale variant of `fiducial`. */
  readonly grayscaleFiducial: "grayscaleFiducial";
};
/** One of the `LifeHashVersion` values. */
type LifeHashVersion = (typeof LifeHashVersion)[keyof typeof LifeHashVersion];
/** The 0–4 number other implementations and the CLI use for a version. */
declare function lifehashVersionCode(version: LifeHashVersion): number;
/** The version for a 0–4 code, or `undefined`. */
declare function lifehashVersionFromCode(code: number): LifeHashVersion | undefined;
//#endregion
//#region src/lifehash.d.ts
/**
 * An RGB(A) image returned from the functions that make LifeHashes.
 */
/** A rendered LifeHash: `pixels` holds `width × height` RGB triples, or RGBA when `channels` is 4. */
interface Image {
  readonly width: number;
  readonly height: number;
  readonly channels: 3 | 4;
  readonly pixels: Uint8Array;
}
/** Options for `lifehash` and `lifehashFromDigest`; every field has a default. */
interface LifeHashOptions {
  /** `"version2"` by default. */
  version?: LifeHashVersion;
  /** Pixels per cell (a positive integer), 1 by default. */
  moduleSize?: number;
  /** Emit RGBA with an opaque alpha channel; RGB by default. */
  alpha?: boolean;
}
/**
 * Make a LifeHash from a UTF-8 string, which may be of any length.
 * The caller is responsible to ensure that the string has undergone any
 * necessary Unicode normalization in order to produce consistent results.
 */
/**
 * The LifeHash of `input`: a string is UTF-8 encoded, bytes are used as is;
 * either is SHA-256 hashed and the digest rendered.
 */
declare function lifehash(input: string | Uint8Array, options?: LifeHashOptions): Image;
/** The LifeHash of a 32-byte digest (use `lifehash` for the data itself). */
declare function lifehashFromDigest(digest: Uint8Array, options?: LifeHashOptions): Image;
//#endregion
//#region src/error.d.ts
/** Error codes: what `lifehash` rejects. */
declare const LifeHashErrorCode: {
  /** `moduleSize` is not a positive integer. */
  readonly InvalidModuleSize: "InvalidModuleSize";
  /** A digest that is not 32 bytes. */
  readonly InvalidDigestLength: "InvalidDigestLength";
};
/** One of the `LifeHashErrorCode` values. */
type LifeHashErrorCode = (typeof LifeHashErrorCode)[keyof typeof LifeHashErrorCode];
/** Thrown for inputs `lifehash` cannot render. */
declare class LifeHashError extends Error {
  readonly code: LifeHashErrorCode;
  constructor(code: LifeHashErrorCode, message: string);
  static isLifeHashError(e: unknown): e is LifeHashError;
  static invalidModuleSize(moduleSize: number): LifeHashError;
  static invalidDigestLength(length: number): LifeHashError;
}
//#endregion
export { type Image, LifeHashError, LifeHashErrorCode, type LifeHashOptions, LifeHashVersion, lifehash, lifehashFromDigest, lifehashVersionCode, lifehashVersionFromCode };
//# sourceMappingURL=index.d.mts.map