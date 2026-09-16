import { isLifeHashVersion, type LifeHashVersion } from "./version";
import { LifeHashError } from "./error";
import { CellGrid } from "./cell-grid";
import { ChangeGrid } from "./change-grid";
import { FracGrid } from "./frac-grid";
import { ColorGrid } from "./color-grid";
import { BitEnumerator } from "./bit-enumerator";
import { selectGradient } from "./gradients";
import { selectPattern } from "./patterns";
import { sha256 } from "@blockchaincommons/crypto";
import { clamped, lerpFrom } from "./color";

/**
 * A rendered LifeHash: `pixels` holds `width × height` RGB triples, or RGBA
 * with an opaque alpha of 255 when `channels` is 4. The record is frozen;
 * the pixel buffer is freshly allocated and may be written to.
 */
export interface LifeHashImage {
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
export interface LifeHashOptions {
  /** `"version2"` by default. */
  readonly version?: LifeHashVersion | undefined;
  /** Pixels per cell (a positive integer), 1 by default. */
  readonly moduleSize?: number | undefined;
  /** Emit RGBA with an opaque alpha channel; RGB by default. */
  readonly alpha?: boolean | undefined;
}

const utf8 = new TextEncoder();

/** The largest pixel buffer `lifehash` will allocate, in bytes. */
const MAX_PIXEL_BYTES = 2 ** 31 - 1;

/** The image's side at module size 1: the cell grid doubled by symmetry, except for fiducials. */
function imageSide(version: LifeHashVersion): number {
  switch (version) {
    case "version1":
    case "version2":
      return 32;
    case "detailed":
      return 64;
    case "fiducial":
    case "grayscaleFiducial":
      return 32;
  }
}

/** `value` is a `Uint8Array` from any realm (a `Buffer` is one). */
function isBytes(value: unknown): value is Uint8Array {
  return (
    value instanceof Uint8Array ||
    (ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === "[object Uint8Array]")
  );
}

interface Resolved {
  readonly version: LifeHashVersion;
  readonly moduleSize: number;
  readonly hasAlpha: boolean;
}

/** Validates `options` and fills in the defaults. */
function resolveOptions(options: LifeHashOptions | undefined): Resolved {
  if (options === undefined) {
    return { version: "version2", moduleSize: 1, hasAlpha: false };
  }
  if (typeof options !== "object" || options === null) {
    throw LifeHashError.invalidArgument("options", options, "an object");
  }
  // Destructuring defaults apply to `undefined` only, so a `null` reaches the checks below.
  const {
    version = "version2",
    moduleSize = 1,
    alpha: hasAlpha = false,
  } = options as {
    version?: unknown;
    moduleSize?: unknown;
    alpha?: unknown;
  };
  if (!isLifeHashVersion(version)) {
    throw LifeHashError.invalidVersion(version);
  }
  if (typeof moduleSize !== "number" || !Number.isInteger(moduleSize) || moduleSize <= 0) {
    throw LifeHashError.invalidModuleSize(moduleSize);
  }
  if (typeof hasAlpha !== "boolean") {
    throw LifeHashError.invalidArgument("alpha", hasAlpha, "a boolean");
  }
  const channels = hasAlpha ? 4 : 3;
  const side = imageSide(version);
  const max = Math.floor(Math.sqrt(MAX_PIXEL_BYTES / channels) / side);
  if (moduleSize > max) {
    throw LifeHashError.moduleSizeTooLarge(
      moduleSize,
      max,
      `${version} ${hasAlpha ? "RGBA" : "RGB"}`,
    );
  }
  return { version, moduleSize, hasAlpha };
}

/** The bits that seed the first generation. */
function seed(digest: Uint8Array, version: LifeHashVersion): Uint8Array {
  switch (version) {
    case "version1":
      return digest;
    case "version2":
      // Hashed once more so a version2 image never resembles the version1 image of the same input.
      return sha256(digest);
    case "detailed":
    case "fiducial":
    case "grayscaleFiducial": {
      // 32 × 32 cells need 128 bytes: the digest (hashed once more for the
      // grayscale fiducial, so it never resembles the colour fiducial) followed
      // by three chained hashes of it.
      const digest1 = version === "grayscaleFiducial" ? sha256(digest) : digest;
      const digest2 = sha256(digest1);
      const digest3 = sha256(digest2);
      const digest4 = sha256(digest3);
      const out = new Uint8Array(128);
      out.set(digest1, 0);
      out.set(digest2, 32);
      out.set(digest3, 64);
      out.set(digest4, 96);
      return out;
    }
  }
}

/** A string key for a generation's packed cells, so a repeated state is detected. */
function stateKey(data: Uint8Array): string {
  let key = "";
  for (const b of data) key += String.fromCharCode(b);
  return key;
}

function makeImage(
  width: number,
  height: number,
  floatColors: Float64Array,
  moduleSize: number,
  hasAlpha: boolean,
): LifeHashImage {
  const scaledWidth = width * moduleSize;
  const scaledHeight = height * moduleSize;
  const channels = hasAlpha ? 4 : 3;
  const pixels = new Uint8Array(scaledWidth * scaledHeight * channels);

  for (let targetY = 0; targetY < scaledHeight; targetY++) {
    const sourceRow = Math.floor(targetY / moduleSize) * width;
    for (let targetX = 0; targetX < scaledWidth; targetX++) {
      const sourceOffset = (sourceRow + Math.floor(targetX / moduleSize)) * 3;
      const targetOffset = (targetY * scaledWidth + targetX) * channels;

      // Every implementation truncates the scaled float toward zero.
      pixels[targetOffset] = Math.trunc(clamped(floatColors[sourceOffset]) * 255);
      pixels[targetOffset + 1] = Math.trunc(clamped(floatColors[sourceOffset + 1]) * 255);
      pixels[targetOffset + 2] = Math.trunc(clamped(floatColors[sourceOffset + 2]) * 255);
      if (hasAlpha) {
        pixels[targetOffset + 3] = 255;
      }
    }
  }

  return Object.freeze({ width: scaledWidth, height: scaledHeight, channels, pixels });
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
export function lifehash(input: string | Uint8Array, options?: LifeHashOptions): LifeHashImage {
  const resolved = resolveOptions(options);
  let data: Uint8Array;
  if (typeof input === "string") {
    data = utf8.encode(input);
  } else if (isBytes(input)) {
    data = input;
  } else {
    throw LifeHashError.invalidArgument("input", input, "a string or a Uint8Array");
  }
  return render(sha256(data), resolved);
}

/**
 * The LifeHash of a 32-byte digest (use `lifehash` for the data itself).
 *
 * @throws `LifeHashError` for a `digest` that is not a `Uint8Array`
 * (`InvalidArgument`) or not 32 bytes long (`InvalidDigestLength`), and for
 * every invalid option.
 */
export function lifehashFromDigest(digest: Uint8Array, options?: LifeHashOptions): LifeHashImage {
  const resolved = resolveOptions(options);
  if (!isBytes(digest)) {
    throw LifeHashError.invalidArgument("digest", digest, "a Uint8Array");
  }
  if (digest.length !== 32) {
    throw LifeHashError.invalidDigestLength(digest.length);
  }
  return render(digest, resolved);
}

function render(digest: Uint8Array, { version, moduleSize, hasAlpha }: Resolved): LifeHashImage {
  // The cell grid's side and the generation limit.
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

  // The grids are reused from generation to generation by swapping them.
  let currentCellGrid = new CellGrid(length, length);
  let nextCellGrid = new CellGrid(length, length);
  let currentChangeGrid = new ChangeGrid(length, length);
  let nextChangeGrid = new ChangeGrid(length, length);

  nextCellGrid.setData(seed(digest, version));
  nextChangeGrid.grid.fill(true);

  // Run the Game of Life until the state repeats or the generation limit is reached.
  const seen = new Set<string>();
  const history: Uint8Array[] = [];
  while (history.length < maxGenerations) {
    [currentCellGrid, nextCellGrid] = [nextCellGrid, currentCellGrid];
    [currentChangeGrid, nextChangeGrid] = [nextChangeGrid, currentChangeGrid];

    const data = currentCellGrid.data();
    const key = stateKey(data);
    if (seen.has(key)) {
      break;
    }
    seen.add(key);
    history.push(data);

    currentCellGrid.nextGeneration(currentChangeGrid, nextCellGrid, nextChangeGrid);
  }

  // Each cell's value is the age of the last generation in which it was alive.
  const fracGrid = new FracGrid(length, length);
  for (let i = 0; i < history.length; i++) {
    currentCellGrid.setData(history[i]);
    const frac = clamped(lerpFrom(0, history.length, i + 1));
    fracGrid.overlay(currentCellGrid, frac);
  }

  // Stretching the ages to the full 0..1 range keeps the whole gradient in
  // use. version1 predates this step and must keep rendering without it.
  if (version !== "version1") {
    let minValue = Infinity;
    let maxValue = -Infinity;
    const values = fracGrid.grid.values;
    for (const value of values) {
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
    }
    for (let i = 0; i < values.length; i++) {
      values[i] = lerpFrom(minValue, maxValue, values[i]);
    }
  }

  // The digest's bits also choose the gradient and the symmetry. Each version
  // skips a different number of bits first so that versions never share colours.
  const entropy = new BitEnumerator(digest);
  switch (version) {
    case "detailed":
      entropy.next();
      break;
    case "version2":
      entropy.nextUint2();
      break;
    case "version1":
    case "fiducial":
    case "grayscaleFiducial":
      break;
  }

  const gradient = selectGradient(entropy, version);
  const pattern = selectPattern(entropy, version);
  const colorGrid = new ColorGrid(fracGrid, gradient, pattern);

  return makeImage(colorGrid.width, colorGrid.height, colorGrid.colors, moduleSize, hasAlpha);
}
