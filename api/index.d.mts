//#region src/version.d.ts
/**
 * The LifeHash versions, in order. `Object.values(LifeHashVersion)` lists the
 * accepted names; `"version2"` is the default.
 */
export declare const LifeHashVersion: {
  /** The original HSB gamut; kept for images made before the CMYK-friendly gamut existed. */
  readonly version1: "version1";
  /** The recommended default: 16 × 16 cells, CMYK-friendly gamut. */
  readonly version2: "version2";
  /** 32 × 32 cells, CMYK-friendly gamut. */
  readonly detailed: "detailed";
  /** 32 × 32 cells without symmetry, high contrast, for machine-vision fiducials. */
  readonly fiducial: "fiducial";
  /** The grayscale variant of `fiducial`. */
  readonly grayscaleFiducial: "grayscaleFiducial";
};
/** One of the `LifeHashVersion` values. */
export type LifeHashVersion = (typeof LifeHashVersion)[keyof typeof LifeHashVersion];
//#endregion
//#region src/lifehash.d.ts
/**
 * A rendered LifeHash: `pixels` holds `width × height` RGB triples, or RGBA
 * with an opaque alpha of 255 when `channels` is 4. The record is frozen;
 * the pixel buffer is freshly allocated and may be written to.
 */
interface LifeHashImage {
  /** Width in pixels: the image's side (32 or 64) times `moduleSize`. */
  readonly width: number;
  /** Height in pixels; LifeHash images are square. */
  readonly height: number;
  /** Bytes per pixel: 3 for RGB, 4 for RGBA. */
  readonly channels: 3 | 4;
  /** Row-major pixel bytes, exactly `width × height × channels` long. */
  readonly pixels: Uint8Array<ArrayBuffer>;
}
/** Options for `lifehash` and `lifehashFromDigest`; every field has a default. */
interface LifeHashOptions {
  /** `"version2"` by default. */
  readonly version?: LifeHashVersion | undefined;
  /** Pixels per cell (a positive integer), 1 by default. */
  readonly moduleSize?: number | undefined;
  /** Emit RGBA with an opaque alpha channel; RGB by default. */
  readonly alpha?: boolean | undefined;
}
/**
 * The LifeHash of `input`: a string is UTF-8 encoded, bytes are used as is;
 * either is SHA-256 hashed and the digest rendered. A 32-byte `Uint8Array`
 * given here is data and is hashed; use `lifehashFromDigest` to render a
 * digest directly.
 *
 * @throws `LifeHashError` for an `input` that is neither a string nor a
 * `Uint8Array`, and for every invalid option.
 */
export declare function lifehash(input: string | Uint8Array, options?: LifeHashOptions): LifeHashImage;
/**
 * The LifeHash of a 32-byte digest (use `lifehash` for the data itself).
 *
 * @throws `LifeHashError` for a `digest` that is not a `Uint8Array`
 * (`InvalidArgument`) or not 32 bytes long (`InvalidDigestLength`), and for
 * every invalid option.
 */
export declare function lifehashFromDigest(digest: Uint8Array, options?: LifeHashOptions): LifeHashImage;
//#endregion
//#region src/error.d.ts
/**
 * The single error type thrown by this package.
 *
 * The reference has no error type: its failures are `assert!` panics on a
 * digest that is not 32 bytes and on a module size of zero. The port throws
 * {@link LifeHashError} at those points and for every input only JavaScript
 * can express, with a machine-readable `code`.
 *
 * @module error
 */
/** The `LifeHashErrorCode` values, for enumeration. */
export declare const LifeHashErrorCode: {
  /** `version` is not one of the `LifeHashVersion` names. */
  readonly InvalidVersion: "InvalidVersion";
  /** `moduleSize` is not a positive integer, or the image it implies exceeds the output ceiling. */
  readonly InvalidModuleSize: "InvalidModuleSize";
  /** A digest that is not 32 bytes. */
  readonly InvalidDigestLength: "InvalidDigestLength";
  /** An argument of the wrong type: `input`, `digest`, `options` or `alpha`. */
  readonly InvalidArgument: "InvalidArgument";
};
/** Machine-readable discriminant for a {@link LifeHashError}. */
export type LifeHashErrorCode = (typeof LifeHashErrorCode)[keyof typeof LifeHashErrorCode];
/** The argument an `InvalidArgument` error names. */
type LifeHashParameter = "input" | "digest" | "options" | "alpha";
/**
 * The structured payload of a {@link LifeHashError}, discriminated by `code`:
 * `e.details.code === "InvalidDigestLength"` narrows to `{ expected, actual }`.
 */
type LifeHashErrorDetails = {
  /** The discriminant. */
  readonly code: "InvalidVersion";
  /** The value received. */
  readonly value: unknown;
} | {
  /** The discriminant. */
  readonly code: "InvalidModuleSize";
  /** The value received. */
  readonly value: unknown;
  /** The largest module size the output ceiling allows for the version and channel count, when that is what was exceeded. */
  readonly max?: number;
} | {
  /** The discriminant. */
  readonly code: "InvalidDigestLength";
  /** The required length. */
  readonly expected: 32;
  /** The length received. */
  readonly actual: number;
} | {
  /** The discriminant. */
  readonly code: "InvalidArgument";
  /** The argument. */
  readonly parameter: LifeHashParameter;
  /** The value received. */
  readonly value: unknown;
};
/**
 * Thrown for an unknown version name (`InvalidVersion`), a module size that
 * is not a positive integer or would exceed the output ceiling
 * (`InvalidModuleSize`), a digest that is not 32 bytes
 * (`InvalidDigestLength`), and an argument of the wrong type
 * (`InvalidArgument`). Every check runs before any rendering. Instances come
 * from the static factories only.
 *
 * @example
 * ```ts
 * try {
 *   lifehash(text, { version: name });
 * } catch (e) {
 *   if (LifeHashError.isLifeHashError(e) && e.is("InvalidVersion")) {
 *     // name is not a LifeHash version
 *   }
 * }
 * ```
 */
export declare class LifeHashError extends Error {
  /** Always `"LifeHashError"`; the cross-copy identity {@link LifeHashError.isLifeHashError} checks. */
  override readonly name = "LifeHashError";
  /** The discriminant; equals `details.code`. */
  readonly code: LifeHashErrorCode;
  /** The structured payload, discriminated by `code`. */
  readonly details: LifeHashErrorDetails;
  private constructor();
  /** Type guard for a `LifeHashError`, including one from another copy of this package. */
  static isLifeHashError(value: unknown): value is LifeHashError;
  /** `true` when `code` is this error's code. */
  is(code: LifeHashErrorCode): boolean;
  /** `value` is not a `LifeHashVersion` name. */
  static invalidVersion(value: unknown): LifeHashError;
  /** `value` is not a positive integer. */
  static invalidModuleSize(value: unknown): LifeHashError;
  /** `value` would make the image exceed the output ceiling; `max` is the largest allowed. */
  static moduleSizeTooLarge(value: number, max: number, what: string): LifeHashError;
  /** The digest had `actual` bytes; 32 were required. */
  static invalidDigestLength(actual: number): LifeHashError;
  /** `parameter` received `value`, which is not of the required type. */
  static invalidArgument(parameter: LifeHashParameter, value: unknown, requirement: string): LifeHashError;
}
//#endregion
export type { LifeHashErrorDetails, LifeHashImage, LifeHashOptions, LifeHashParameter };
//# sourceMappingURL=index.d.mts.map