/**
 * LifeHash: a visual hash. `makeFromUtf8("Hello")` renders a 32 × 32 image
 * whose pixels are a deterministic function of the input, identical across
 * every LifeHash implementation.
 *
 * - **Render:** `makeFromUtf8(text, options?)` hashes a string and
 *   `makeFromData(data, options?)` hashes bytes; both render the digest.
 *   `makeFromDigest(digest, options?)` renders a 32-byte digest directly.
 * - **Options:** `version` (`"version2"` by default), `moduleSize` (pixels
 *   per cell), `hasAlpha` (RGBA instead of RGB).
 * - **Result:** a frozen `LifeHashImage` `{ width, height, channels, colors }`.
 * - **Errors:** every invalid argument throws `LifeHashError` with a `code`
 *   and typed `details`, before any rendering.
 *
 * @packageDocumentation
 */
export {
  makeFromData,
  makeFromDigest,
  makeFromUtf8,
  type LifeHashImage,
  type LifeHashOptions,
} from "./lifehash";
export { LifeHashVersion } from "./version";
export {
  LifeHashError,
  LifeHashErrorCode,
  type LifeHashErrorDetails,
  type LifeHashParameter,
} from "./error";
