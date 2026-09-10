/**
 * Copyright © 2023-2026 Blockchain Commons, LLC
 * Copyright © 2025-2026 Parity Technologies
 *
 */

import { type LifeHashVersion } from "./version";
import { LifeHashError } from "./error";
import { CellGrid } from "./cell-grid";
import { ChangeGrid } from "./change-grid";
import { FracGrid } from "./frac-grid";
import { ColorGrid } from "./color-grid";
import { BitEnumerator } from "./bit-enumerator";
import { selectGradient } from "./gradients";
import { selectPattern } from "./patterns";
import { sha256 } from "@blockchaincommons/crypto";
import { clamped, lerpFrom, min, max } from "./color";
import { dataToHex } from "./hex";

/**
 * An RGB(A) image returned from the functions that make LifeHashes.
 */
/** A rendered LifeHash: `pixels` holds `width × height` RGB triples, or RGBA when `channels` is 4. */
export interface Image {
  readonly width: number;
  readonly height: number;
  readonly channels: 3 | 4;
  readonly pixels: Uint8Array;
}

/** Options for `lifehash` and `lifehashFromDigest`; every field has a default. */
export interface LifeHashOptions {
  /** `"version2"` by default. */
  version?: LifeHashVersion;
  /** Pixels per cell (a positive integer), 1 by default. */
  moduleSize?: number;
  /** Emit RGBA with an opaque alpha channel; RGB by default. */
  alpha?: boolean;
}

function makeImage(
  width: number,
  height: number,
  floatColors: Float64Array,
  moduleSize: number,
  hasAlpha: boolean,
): Image {
  const scaledWidth = width * moduleSize;
  const scaledHeight = height * moduleSize;
  const resultComponents = hasAlpha ? 4 : 3;
  const scaledCapacity = scaledWidth * scaledHeight * resultComponents;

  const resultColors = new Uint8Array(scaledCapacity);

  // Match C++/Rust loop order: outer uses scaledWidth, inner uses
  // scaledHeight (variables intentionally swapped relative to their names —
  // harmless because LifeHash images are always square).
  for (let targetY = 0; targetY < scaledWidth; targetY++) {
    for (let targetX = 0; targetX < scaledHeight; targetX++) {
      const sourceX = Math.floor(targetX / moduleSize);
      const sourceY = Math.floor(targetY / moduleSize);
      const sourceOffset = (sourceY * width + sourceX) * 3;
      const targetOffset = (targetY * scaledWidth + targetX) * resultComponents;

      // Rust `(x as u8)` truncates an f64 toward zero and saturates to
      // [0, 255]; Math.trunc + Uint8Array assignment does the same in JS.
      resultColors[targetOffset] = Math.trunc(clamped(floatColors[sourceOffset]) * 255);
      resultColors[targetOffset + 1] = Math.trunc(clamped(floatColors[sourceOffset + 1]) * 255);
      resultColors[targetOffset + 2] = Math.trunc(clamped(floatColors[sourceOffset + 2]) * 255);

      if (hasAlpha) {
        resultColors[targetOffset + 3] = 255;
      }
    }
  }

  return {
    width: scaledWidth,
    height: scaledHeight,
    channels: hasAlpha ? 4 : 3,
    pixels: resultColors,
  };
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
export function lifehash(input: string | Uint8Array, options: LifeHashOptions = {}): Image {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return lifehashFromDigest(sha256(data), options);
}

/** The LifeHash of a 32-byte digest (use `lifehash` for the data itself). */
export function lifehashFromDigest(digest: Uint8Array, options: LifeHashOptions = {}): Image {
  const { version = "version2", moduleSize = 1, alpha: hasAlpha = false } = options;
  if (!Number.isInteger(moduleSize) || moduleSize <= 0) {
    throw LifeHashError.invalidModuleSize(moduleSize);
  }
  if (digest.length !== 32) {
    throw LifeHashError.invalidDigestLength(digest.length);
  }

  let length: number;
  let maxGenerations: number;

  switch (version) {
    case "version1":
    case "version2":
      length = 16;
      maxGenerations = 150;
      break;
    case "detailed":
    case "fiducial":
    case "grayscaleFiducial":
      length = 32;
      maxGenerations = 300;
      break;
  }

  // These get reused from generation to generation by swapping them.
  let currentCellGrid = new CellGrid(length, length);
  let nextCellGrid = new CellGrid(length, length);
  let currentChangeGrid = new ChangeGrid(length, length);
  let nextChangeGrid = new ChangeGrid(length, length);

  const historySet = new Set<string>();
  const history: Uint8Array[] = [];

  // Initialize the cell grid based on version
  switch (version) {
    case "version1":
      nextCellGrid.setData(new Uint8Array(digest));
      break;
    case "version2":
      // Ensure that .version2 in no way resembles .version1
      nextCellGrid.setData(sha256(new Uint8Array(digest)));
      break;
    case "detailed":
    case "fiducial":
    case "grayscaleFiducial": {
      let digest1: Uint8Array = new Uint8Array(digest);
      // Ensure that grayscale fiducials in no way resemble the regular color fiducials
      if (version === "grayscaleFiducial") {
        digest1 = sha256(digest1);
      }
      const digest2 = sha256(digest1);
      const digest3 = sha256(digest2);
      const digest4 = sha256(digest3);

      const digestFinal = new Uint8Array(128);
      digestFinal.set(digest1, 0);
      digestFinal.set(digest2, 32);
      digestFinal.set(digest3, 64);
      digestFinal.set(digest4, 96);

      nextCellGrid.setData(digestFinal);
      break;
    }
  }

  nextChangeGrid.grid.fill(true);

  // Run the Game of Life
  while (history.length < maxGenerations) {
    // Swap grids
    [currentCellGrid, nextCellGrid] = [nextCellGrid, currentCellGrid];
    [currentChangeGrid, nextChangeGrid] = [nextChangeGrid, currentChangeGrid];

    const data = currentCellGrid.data();
    const hash = sha256(data);
    const hashHex = dataToHex(hash);

    if (historySet.has(hashHex)) {
      break;
    }
    historySet.add(hashHex);
    history.push(data);

    currentCellGrid.nextGeneration(currentChangeGrid, nextCellGrid, nextChangeGrid);
  }

  // Build the frac grid from history
  const fracGrid = new FracGrid(length, length);
  for (let i = 0; i < history.length; i++) {
    currentCellGrid.setData(history[i]);
    const frac = clamped(lerpFrom(0, history.length, i + 1));
    fracGrid.overlay(currentCellGrid, frac);
  }

  // Normalizing the frac_grid to the range 0..1 was a step left out of .version1
  // In some cases it can cause the full range of the gradient to go unused.
  // This fixes the problem for the other versions, while remaining compatible
  // with .version1.
  if (version !== "version1") {
    let minValue = Infinity;
    let maxValue = -Infinity;
    const values = fracGrid.grid.values;
    for (const value of values) {
      minValue = min(minValue, value);
      maxValue = max(maxValue, value);
    }
    for (let i = 0; i < values.length; i++) {
      values[i] = lerpFrom(minValue, maxValue, values[i]);
    }
  }

  // Select gradient and pattern
  const entropy = new BitEnumerator(new Uint8Array(digest));

  switch (version) {
    case "detailed":
      // Throw away a bit of entropy to ensure we generate different colors and patterns from .version1
      entropy.next();
      break;
    case "version2":
      // Throw away two bits of entropy to ensure we generate different colors and patterns from .version1 or .detailed.
      entropy.nextUint2();
      break;
    case "version1":
    case "fiducial":
    case "grayscaleFiducial":
      // No entropy adjustment needed
      break;
  }

  const gradient = selectGradient(entropy, version);
  const pattern = selectPattern(entropy, version);
  const colorGrid = new ColorGrid(fracGrid, gradient, pattern);

  return makeImage(colorGrid.width, colorGrid.height, colorGrid.colors, moduleSize, hasAlpha);
}
