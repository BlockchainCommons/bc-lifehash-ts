/**
 * Render a LifeHash for a string and describe the image.
 *
 *   bun examples/render.ts "Hello, World!" detailed
 *
 * Prints the image's dimensions, its channel count and the SHA-256 of its
 * pixel buffer (the same fingerprint the golden vectors record), then the
 * first row of pixels as hex.
 */
import { createHash } from "node:crypto";
import {
  makeFromUtf8,
  LifeHashError,
  LifeHashVersion,
  type LifeHashVersion as Version,
} from "../src";

const [input = "Hello, World!", versionArg = "version2"] = process.argv.slice(2);

const versions = Object.values(LifeHashVersion);
if (!(versions as string[]).includes(versionArg)) {
  console.error(`unknown version ${JSON.stringify(versionArg)}; one of: ${versions.join(", ")}`);
  process.exit(1);
}
const version = versionArg as Version;

try {
  const image = makeFromUtf8(input, { version, hasAlpha: true });
  const fingerprint = createHash("sha256").update(image.colors).digest("hex");
  console.log(`${image.width}×${image.height}, ${image.channels} channels, sha256 ${fingerprint}`);
  const row = image.colors.subarray(0, image.width * image.channels);
  console.log(Buffer.from(row).toString("hex"));
} catch (e) {
  if (LifeHashError.isLifeHashError(e)) {
    console.error(`${e.code}: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
