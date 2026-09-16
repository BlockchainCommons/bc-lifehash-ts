//#region src/version.d.ts
/**
 * Copyright © 2023-2026 Blockchain Commons, LLC
 * Copyright © 2025-2026 Parity Technologies
 *
 *
 * The available versions of LifeHash.
 */
declare enum Version {
  /** DEPRECATED. Uses HSB gamut. Not CMYK-friendly. Has some minor gradient bugs. */
  version1 = 0,
  /** CMYK-friendly gamut. Recommended for most purposes. */
  version2 = 1,
  /** Double resolution. CMYK-friendly gamut. */
  detailed = 2,
  /** Optimized for generating machine-vision fiducials. High-contrast. CMYK-friendly gamut. */
  fiducial = 3,
  /** Optimized for generating machine-vision fiducials. High-contrast. Grayscale. */
  grayscale_fiducial = 4
}
//#endregion
//#region src/data.d.ts
/**
 * Copyright © 2023-2026 Blockchain Commons, LLC
 * Copyright © 2025-2026 Parity Technologies
 *
 *
 * An idiom for a block of data used throughout LifeHash.
 */
type Data = Uint8Array;
//#endregion
//#region src/lib.d.ts
/**
 * An RGB(A) image returned from the functions that make LifeHashes.
 */
interface Image {
  width: number;
  height: number;
  colors: Uint8Array;
}
/**
 * Make a LifeHash from a UTF-8 string, which may be of any length.
 * The caller is responsible to ensure that the string has undergone any
 * necessary Unicode normalization in order to produce consistent results.
 */
declare function makeFromUtf8(s: string, version?: Version, moduleSize?: number, hasAlpha?: boolean): Image;
/**
 * Make a LifeHash from given data, which may be of any size.
 */
declare function makeFromData(data: Data, version?: Version, moduleSize?: number, hasAlpha?: boolean): Image;
/**
 * Make a LifeHash from the SHA256 digest of some other data.
 * The digest must be exactly 32 pseudorandom bytes. This is the base
 * LifeHash creation algorithm, but if you don't already have a SHA256 hash of
 * some data, then you should access it by calling `makeFromData()`. If you
 * are starting with a UTF-8 string, call `makeFromUtf8()`.
 */
declare function makeFromDigest(digest: Data, version?: Version, moduleSize?: number, hasAlpha?: boolean): Image;
//#endregion
export { type Data, type Image, Version, makeFromData, makeFromDigest, makeFromUtf8 };
//# sourceMappingURL=index.d.mts.map