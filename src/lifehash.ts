import { isLifeHashVersion, type LifeHashVersion } from "./version";
import { LifeHashError } from "./error";
import { CellGrid } from "./cell-grid";
import { ChangeGrid } from "./change-grid";
import { FracGrid } from "./frac-grid";
import { ColorGrid } from "./color-grid";
import { BitEnumerator } from "./bit-enumerator";
import { selectGradient } from "./gradients";
import { selectPattern } from "./patterns";
import { sha256 } from "@noble/hashes/sha2.js";
import { clamped, lerpFrom } from "./color";

/**
 * A rendered LifeHash: `colors` holds `width × height` RGB triples, or RGBA
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
  readonly colors: Uint8Array<ArrayBuffer>;
}

/**
 * Options for `makeFromUtf8`, `makeFromData` and `makeFromDigest`: the
 * reference's three trailing parameters, each with the default the C++
 * library uses.
 */
export interface LifeHashOptions {
  /** `"version2"` by default. */
  readonly version?: LifeHashVersion | undefined;
  /** Pixels per cell (a positive integer), 1 by default. */
  readonly moduleSize?: number | undefined;
  /** Emit RGBA with an opaque alpha channel; RGB by default. */
  readonly hasAlpha?: boolean | undefined;
}

const utf8 = new TextEncoder();

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
    hasAlpha = false,
  } = options as {
    version?: unknown;
    moduleSize?: unknown;
    hasAlpha?: unknown;
  };
  if (!isLifeHashVersion(version)) {
    throw LifeHashError.invalidVersion(version);
  }
  if (typeof moduleSize !== "number" || !Number.isInteger(moduleSize) || moduleSize <= 0) {
    throw LifeHashError.invalidModuleSize(moduleSize);
  }
  if (typeof hasAlpha !== "boolean") {
    throw LifeHashError.invalidArgument("hasAlpha", hasAlpha, "a boolean");
  }
  // The reference allocates whatever size the machine grants. A JavaScript
  // `number` cannot count more than 2 ** 53 - 1 bytes, so only a size beyond
  // that is rejected here; an allocation the engine refuses throws its own
  // `RangeError`, as the reference aborts.
  const channels = hasAlpha ? 4 : 3;
  const side = imageSide(version);
  const scaledSide = side * moduleSize;
  if (!Number.isSafeInteger(scaledSide * scaledSide * channels)) {
    const max = Math.floor(Math.sqrt(Number.MAX_SAFE_INTEGER / channels) / side);
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
  const colors = new Uint8Array(scaledWidth * scaledHeight * channels);

  for (let targetY = 0; targetY < scaledHeight; targetY++) {
    const sourceRow = Math.floor(targetY / moduleSize) * width;
    for (let targetX = 0; targetX < scaledWidth; targetX++) {
      const sourceOffset = (sourceRow + Math.floor(targetX / moduleSize)) * 3;
      const targetOffset = (targetY * scaledWidth + targetX) * channels;

      // Every implementation truncates the scaled float toward zero.
      colors[targetOffset] = Math.trunc(clamped(floatColors[sourceOffset]) * 255);
      colors[targetOffset + 1] = Math.trunc(clamped(floatColors[sourceOffset + 1]) * 255);
      colors[targetOffset + 2] = Math.trunc(clamped(floatColors[sourceOffset + 2]) * 255);
      if (hasAlpha) {
        colors[targetOffset + 3] = 255;
      }
    }
  }

  return Object.freeze({ width: scaledWidth, height: scaledHeight, channels, colors });
}

/**
 * The LifeHash of a string: `text` is UTF-8 encoded, SHA-256 hashed and the
 * digest rendered.
 *
 * @throws `LifeHashError` for a `text` that is not a string
 * (`InvalidArgument`), and for every invalid option.
 */
export function makeFromUtf8(text: string, options?: LifeHashOptions): LifeHashImage {
  // The data argument is checked before the options, in parameter order.
  if (typeof text !== "string") {
    throw LifeHashError.invalidArgument("text", text, "a string");
  }
  return render(sha256(utf8.encode(text)), resolveOptions(options));
}

/**
 * The LifeHash of arbitrary bytes: `data` is SHA-256 hashed and the digest
 * rendered. A 32-byte `data` is hashed like any other; `makeFromDigest`
 * renders a digest directly.
 *
 * @throws `LifeHashError` for a `data` that is not a `Uint8Array`
 * (`InvalidArgument`), and for every invalid option.
 */
export function makeFromData(data: Uint8Array, options?: LifeHashOptions): LifeHashImage {
  if (!isBytes(data)) {
    throw LifeHashError.invalidArgument("data", data, "a Uint8Array");
  }
  return render(sha256(data), resolveOptions(options));
}

/**
 * The LifeHash of a 32-byte digest, rendered directly (use `makeFromData`
 * for the data itself).
 *
 * @throws `LifeHashError` for a `digest` that is not a `Uint8Array`
 * (`InvalidArgument`) or not 32 bytes long (`InvalidDigestLength`), and for
 * every invalid option.
 */
export function makeFromDigest(digest: Uint8Array, options?: LifeHashOptions): LifeHashImage {
  // The digest is checked before the options, as the reference checks it on entry.
  if (!isBytes(digest)) {
    throw LifeHashError.invalidArgument("digest", digest, "a Uint8Array");
  }
  if (digest.length !== 32) {
    throw LifeHashError.invalidDigestLength(digest.length);
  }
  return render(digest, resolveOptions(options));
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
