# Migrating to the redesigned `@blockchaincommons/lifehash`

The pixels are unchanged for every valid input: images rendered before and
after the redesign are byte-identical (proven by `tests/differential.test.ts`
against the frozen pre-redesign bundle and by `tests/rust-validation`
against `bc-lifehash-rust` 0.1.0, 745 of 745 vectors). Only the API moved.

## Entry points

| Before | After |
|---|---|
| `makeFromUtf8(s, version, moduleSize, hasAlpha)` | `lifehash(s, { version, moduleSize, alpha })` |
| `makeFromData(bytes, version, moduleSize, hasAlpha)` | `lifehash(bytes, { version, moduleSize, alpha })` |
| `makeFromDigest(digest, version, moduleSize, hasAlpha)` | `lifehashFromDigest(digest, { version, moduleSize, alpha })` |

Every option has the same default as before (`"version2"`, `1`, `false`).

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

`lifehashVersionCode(v)` gives the 0–4 number, `lifehashVersionFromCode(n)`
the version, for CLIs and other implementations that pass the number.

## Image

`Image.colors` is `Image.pixels` (the same `Uint8Array`), and
`Image.channels` (`3` or `4`) says whether an alpha byte follows each RGB
triple. `Data` (an alias of `Uint8Array`) is gone.

## Errors

A `moduleSize` that is not a positive integer, or a digest that is not 32
bytes, throws `LifeHashError` with `code` `"InvalidModuleSize"` or
`"InvalidDigestLength"` (before: a plain `Error` with a message, thrown after
rendering in the module-size case). `LifeHashError.isLifeHashError(e)` guards.

## Appendix: migrating from `@bcts/lifehash`

`@blockchaincommons/lifehash` is the canonical home of this library. It was extracted from the
[`paritytech/bcts`](https://github.com/paritytech/bcts) monorepo, where it was
published as `@bcts/lifehash`, into its own Blockchain Commons repository at
[`BlockchainCommons/bc-lifehash-ts`](https://github.com/BlockchainCommons/bc-lifehash-ts).

For the extraction release, **`1.0.0-beta.1`, the public API is unchanged.** The
migration is a rename. `@bcts/lifehash` remains published for one beta cycle as a
thin re-export of this package, so nothing breaks the moment you update.

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
+   "@blockchaincommons/lifehash": "^1.0.0-beta.1"
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

### 5. Peer packages renamed too

Every sibling library moved from the `@bcts` scope to `@blockchaincommons`. If
you depend on more than one, rename them together so a single copy of each
shared type is resolved:

| Old | New |
|---|---|
| `@bcts/dcbor` | `@blockchaincommons/dcbor` |
| `@bcts/<name>` | `@blockchaincommons/<name>` |

### 6. What did not change

- The public API: every exported name, signature and type is identical.
- The wire format. Encodings produced by `@bcts/lifehash` decode here, and the reverse.
- Parity with the Rust reference implementation. See [`RUST_DIVERGENCES.md`](./RUST_DIVERGENCES.md).
