/**
 * LifeHash: a visual hash. `lifehash("Hello")` renders a 32 × 32 image whose
 * pixels are a deterministic function of the input, identical across every
 * LifeHash implementation.
 *
 * - **Render:** `lifehash(input, options?)` hashes a string or bytes and
 *   renders the digest; `lifehashFromDigest(digest, options?)` renders a
 *   32-byte digest directly.
 * - **Options:** `version` (`"version2"` by default), `moduleSize` (pixels
 *   per cell), `alpha` (RGBA instead of RGB).
 * - **Result:** a frozen `LifeHashImage` `{ width, height, channels, pixels }`.
 * - **Errors:** every invalid argument throws `LifeHashError` with a `code`
 *   and typed `details`, before any rendering.
 *
 * @packageDocumentation
 */
export { lifehash, lifehashFromDigest, type LifeHashImage, type LifeHashOptions } from "./lifehash";
export { LifeHashVersion } from "./version";
export {
  LifeHashError,
  LifeHashErrorCode,
  type LifeHashErrorDetails,
  type LifeHashParameter,
} from "./error";
