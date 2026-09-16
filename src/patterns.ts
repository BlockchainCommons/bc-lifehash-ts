import { type BitEnumerator } from "./bit-enumerator";
import { type LifeHashVersion } from "./version";

/**
 * The symmetry applied to the cell grid: mirrored around both axes
 * (`snowflake`), rotated around the centre (`pinwheel`), or none (`fiducial`).
 */
export type Pattern = "snowflake" | "pinwheel" | "fiducial";

/** The pattern for a version, drawing one bit of entropy where the version allows a choice. */
export function selectPattern(entropy: BitEnumerator, version: LifeHashVersion): Pattern {
  switch (version) {
    case "fiducial":
    case "grayscaleFiducial":
      return "fiducial";
    case "version1":
    case "version2":
    case "detailed":
      return entropy.next() ? "snowflake" : "pinwheel";
  }
}
