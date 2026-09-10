/**
 * LifeHash versions. `version2` is the default; `version1` is kept for
 * images made before the CMYK-friendly gamut existed.
 */
export const LifeHashVersion = {
  /** The original HSB gamut (deprecated). */
  version1: "version1",
  /** The recommended default: CMYK-friendly gamut. */
  version2: "version2",
  /** Double resolution, CMYK-friendly gamut. */
  detailed: "detailed",
  /** High contrast, optimised for machine-vision fiducials. */
  fiducial: "fiducial",
  /** Grayscale variant of `fiducial`. */
  grayscaleFiducial: "grayscaleFiducial",
} as const;

/** One of the `LifeHashVersion` values. */
export type LifeHashVersion = (typeof LifeHashVersion)[keyof typeof LifeHashVersion];

const CODES: Record<LifeHashVersion, number> = {
  version1: 0,
  version2: 1,
  detailed: 2,
  fiducial: 3,
  grayscaleFiducial: 4,
};

/** The 0–4 number other implementations and the CLI use for a version. */
export function lifehashVersionCode(version: LifeHashVersion): number {
  return CODES[version];
}

/** The version for a 0–4 code, or `undefined`. */
export function lifehashVersionFromCode(code: number): LifeHashVersion | undefined {
  return (Object.keys(CODES) as LifeHashVersion[]).find((v) => CODES[v] === code);
}
