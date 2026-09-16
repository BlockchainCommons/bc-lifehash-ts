/**
 * The LifeHash versions, in order. `Object.values(LifeHashVersion)` lists the
 * accepted names; `"version2"` is the default.
 */
export const LifeHashVersion: {
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
} = Object.freeze({
  version1: "version1",
  version2: "version2",
  detailed: "detailed",
  fiducial: "fiducial",
  grayscaleFiducial: "grayscaleFiducial",
});

/** One of the `LifeHashVersion` values. */
export type LifeHashVersion = (typeof LifeHashVersion)[keyof typeof LifeHashVersion];

const NAMES: ReadonlySet<string> = new Set(Object.values(LifeHashVersion));

/** @internal `value` is one of the version names. */
export function isLifeHashVersion(value: unknown): value is LifeHashVersion {
  return typeof value === "string" && NAMES.has(value);
}
