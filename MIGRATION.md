# Migrating from `@bcts/lifehash` to `@blockchaincommons/lifehash`

`@blockchaincommons/lifehash` is the successor to `@bcts/lifehash`.

## Entry points

The three functions keep their names; the three positional parameters after
the data became an options object:

| Before | After |
|---|---|
| `makeFromUtf8(s, version, moduleSize, hasAlpha)` | `makeFromUtf8(s, { version, moduleSize, hasAlpha })` |
| `makeFromData(bytes, version, moduleSize, hasAlpha)` | `makeFromData(bytes, { version, moduleSize, hasAlpha })` |
| `makeFromDigest(digest, version, moduleSize, hasAlpha)` | `makeFromDigest(digest, { version, moduleSize, hasAlpha })` |

Every option has the same default as before (`"version2"`, `1`, `false`).
Each function checks its data argument before the options.

### Worked example: a command-line renderer

```diff
- import { makeFromUtf8, Version, type Image } from "@bcts/lifehash";
+ import { makeFromUtf8, type LifeHashImage } from "@blockchaincommons/lifehash";

- const image: Image = makeFromUtf8(text, parseVersion(name), moduleSize, hasAlpha);
- writePng(image.width, image.height, image.colors, hasAlpha ? 4 : 3);
+ const image: LifeHashImage = makeFromUtf8(text, { version: name, moduleSize, hasAlpha });
+ writePng(image.width, image.height, image.colors, image.channels);
```

An unknown `name` throws `LifeHashError` with code `"InvalidVersion"`, so a
hand-written `parseVersion` is no longer needed; `Object.values(LifeHashVersion)`
lists the accepted names for a `--help` text.

## Versions

`Version` (a numeric enum) is `LifeHashVersion`, a string union with an
`as const` object:

| Before | After |
|---|---|
| `Version.version1` (0) | `"version1"` |
| `Version.version2` (1) | `"version2"` |
| `Version.detailed` (2) | `"detailed"` |
| `Version.fiducial` (3) | `"fiducial"` |
| `Version.grayscale_fiducial` (4) | `"grayscaleFiducial"` |

The numbers were the ordinals of the old enum and appear on no wire; nothing
replaces them. `Object.values(LifeHashVersion)` lists the names in order.

## Image

`Image` is `LifeHashImage` (the old name collides with the DOM's `Image`).
`colors` keeps its name, now typed `Uint8Array<ArrayBuffer>`, and `channels`
(`3` or `4`) says whether an alpha byte follows each RGB triple. The record
is frozen; the pixel buffer is not. `Data` (an alias of `Uint8Array`) is
gone.

## Errors

Every argument is checked before rendering and a failure throws
`LifeHashError` with a `code`, `details` typed by that code, and `is(code)`:

| Input | Before | After |
|---|---|---|
| `moduleSize` not a positive integer | plain `Error`, thrown after rendering | `InvalidModuleSize` |
| `moduleSize` whose image would hold more than `2 ** 53 - 1` bytes | engine `RangeError` | `InvalidModuleSize` with `details.max` |
| digest not 32 bytes | plain `Error` | `InvalidDigestLength` |
| unknown version | not expressible (numeric enum) | `InvalidVersion` |
| `text`/`data`/`digest` of the wrong type, `options` not an object, `hasAlpha` not a boolean | engine or dependency error, or silently coerced | `InvalidArgument` naming `details.parameter` |

`LifeHashError.isLifeHashError(e)` recognises an error from any copy of the
package (ESM and CommonJS builds included).

## From `1.0.0-beta.1`

`1.0.0-beta.1` shipped a different surface for a day. If you installed it:

| `1.0.0-beta.1` | `1.0.0-beta.2` |
|---|---|
| `lifehash(string, options)` | `makeFromUtf8(text, options)` |
| `lifehash(bytes, options)` | `makeFromData(data, options)` |
| `lifehashFromDigest(digest, options)` | `makeFromDigest(digest, options)` |
| option `alpha` | option `hasAlpha` |
| `image.pixels` | `image.colors` |
| `InvalidModuleSize` for an image over 2 GB | rendered; only an image over `2 ** 53 - 1` bytes is rejected |
| runtime dependency `@blockchaincommons/crypto` | `@noble/hashes` |

## Appendix: migrating from `@bcts/lifehash`

`@blockchaincommons/lifehash` is the canonical home of this library. It was extracted from the
[`paritytech/bcts`](https://github.com/paritytech/bcts) monorepo, where it was
published as `@bcts/lifehash`, into its own Blockchain Commons repository at
[`BlockchainCommons/bc-lifehash-ts`](https://github.com/BlockchainCommons/bc-lifehash-ts).

`1.0.0-beta.1` was the first release under the new scope and `1.0.0-beta.2`
restored the reference's names; the sections above describe the current
surface and list every renamed and removed name.

### TL;DR checklist

- [ ] Replace the `@bcts/lifehash` dependency with `@blockchaincommons/lifehash`.
- [ ] Rewrite import specifiers: `@bcts/lifehash` becomes `@blockchaincommons/lifehash`.
- [ ] Raise your Node floor to **22.12**.
- [ ] Ensure TypeScript **>= 5.7** to consume the published types.
- [ ] If you relied on the `browser` field or a global-script build, switch to the ESM or CJS entry point.

### 1. Package name and imports

```diff
- import { /* ... */ } from "@bcts/lifehash";
+ import { /* ... */ } from "@blockchaincommons/lifehash";
```

```diff
  "dependencies": {
-   "@bcts/lifehash": "^1.0.0-beta.6"
+   "@blockchaincommons/lifehash": "^1.0.0-beta.2"
  }
```

### 2. Version numbering restarts

`@bcts/lifehash` versions moved in lockstep with every other package in the
monorepo, which is why it reached `1.0.0-beta.6`. Each extracted package now
versions independently and starts again at `1.0.0-beta.1`. A lower version
number here does **not** mean older code.

### 3. Node and TypeScript floors moved up

| | `@bcts/lifehash` | `@blockchaincommons/lifehash` |
|---|---|---|
| Node | `>= 18` | `>= 22.12` |
| TypeScript (consumers) | 6.x | `>= 5.7` |

### 4. The IIFE / global-script build is gone

`@bcts/lifehash` shipped an additional IIFE bundle exposed through the `browser`
field. That build is dropped: IIFE entry points cannot share chunks, which forks
module-level singletons across entry points. Use the ESM entry (`import`) or the
CJS entry (`require`); both are declared in `exports` and validated in CI by
`publint` and `@arethetypeswrong/cli`.
