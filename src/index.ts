/**
 * LifeHash: a visual hash. `lifehash("Hello")` renders a 32×32 image whose
 * pixels are a deterministic function of the input.
 *
 * @module
 */
export { lifehash, lifehashFromDigest, type Image, type LifeHashOptions } from "./lifehash";
export { LifeHashVersion, lifehashVersionCode, lifehashVersionFromCode } from "./version";
export { LifeHashError, LifeHashErrorCode } from "./error";
