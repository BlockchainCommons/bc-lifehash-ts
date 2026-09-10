/**
 * Copyright © 2023-2026 Blockchain Commons, LLC
 * Copyright © 2025-2026 Parity Technologies
 *
 */

import { type BitEnumerator } from "./bit-enumerator";
import { type LifeHashVersion } from "./version";

/**
 * The symmetries used by LifeHash.
 */
export enum Pattern {
  /** Mirror around central axes. */
  snowflake = "snowflake",
  /** Rotate around center. */
  pinwheel = "pinwheel",
  /** Identity (no symmetry). */
  fiducial = "fiducial",
}

/**
 * A function that takes a deterministic source of bits and selects a pattern
 * used to add symmetry to a particular LifeHash version.
 */
export function selectPattern(entropy: BitEnumerator, version: LifeHashVersion): Pattern {
  switch (version) {
    case "fiducial":
    case "grayscaleFiducial":
      return Pattern.fiducial;
    case "version1":
    case "version2":
    case "detailed":
      return entropy.next() ? Pattern.snowflake : Pattern.pinwheel;
  }
}
