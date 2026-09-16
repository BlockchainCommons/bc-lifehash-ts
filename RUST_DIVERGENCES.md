# Divergences from the Rust reference implementation

This library is a TypeScript port of
[`BlockchainCommons/bc-lifehash-rust`](https://github.com/BlockchainCommons/bc-lifehash-rust),
tracked at version **0.1.0**
([`081daa0`](https://github.com/BlockchainCommons/bc-lifehash-rust/commit/081daa072e1095b9100f35d2ee3cfe17e9f5bbb2)).

The tracked version and commit are recorded in
[`.github/versions.yml`](./.github/versions.yml), and the `upstream.yml`
workflow opens a tracking issue whenever the reference implementation moves
ahead of it.

This document is the deliberate record of every place the TypeScript behaviour
differs from the Rust reference. It has three kinds of entry:

1. **True behavioral divergences** - the same input produces a different outcome.
2. **JS-only input domain** - inputs that have no Rust analog, so there is nothing to diverge from.
3. **Mapping equivalences** - JS-specific inputs that are validated through the bytes they produce.

Every entry below is checked by `tests/rust-validation`, a Rust program that
replays `tests/vectors/vectors.json` (1 814 vectors: a hand corpus and random
inputs at every version, module size and alpha mode, the 35 upstream vectors,
1 000 reference-rendered inputs, and the JavaScript-only rows below) against
the `bc-lifehash` release from crates.io, comparing image dimensions and the
SHA-256 of the pixel buffer. The current run: **1 775 match, 4 both reject,
35 JS-only, 0 mismatches.**

## 1. True behavioral divergences

_None._ Every pixel of every vector is identical.

## 2. JS-only input domain

The reference's types make these inputs inexpressible; the port rejects each
with `LifeHashError` before rendering. The harness counts them as JS-only.

| Input | Port |
|---|---|
| `version` not one of the five names (`"bogus"`, `"Version2"`, `1`) | `InvalidVersion` |
| `moduleSize` not a positive integer (`0`, `-1`, `1.5`, `NaN`, `Infinity`, `"2"`, `2n`) | `InvalidModuleSize` (the reference panics for `0`; `-1` and `1.5` cannot be expressed) |
| `moduleSize` whose image would exceed `2 ** 31 - 1` bytes (e.g. 363 for `detailed` RGBA) | `InvalidModuleSize` with `details.max` (the reference aborts on allocation failure, or loops for as long as the machine overcommits) |
| digest not 32 bytes | `InvalidDigestLength` (the reference panics) |
| digest not a `Uint8Array` (a string, an array of numbers, an `ArrayBuffer`, an array-like) | `InvalidArgument` |
| `input` neither a string nor a `Uint8Array` | `InvalidArgument` |
| `options` not an object (`null`, a number) | `InvalidArgument` |
| `alpha` not a boolean (`1`, `"yes"`, `0`, `null`) | `InvalidArgument` |

## 3. Mapping equivalences

- `lifehash(string)` is `make_from_utf8`; `lifehash(Uint8Array)` is
  `make_from_data`; `lifehashFromDigest` is `make_from_digest`.
  `LifeHashVersion` names map to the `Version` variants in order.
- A `Uint8Array` from any realm, a `Buffer`, and a `subarray` view are all
  accepted and render as the same bytes would.
- A string containing a lone surrogate is encoded with U+FFFD in its place,
  as `TextEncoder` does; a Rust `&str` cannot contain one.
- `LifeHashImage.channels` records what `has_alpha` chose; the reference's
  `Image` does not.

## Maintenance

When the upstream reference moves:

1. Review the diff via the link in the `upstream.yml` tracking issue.
2. Port the relevant changes.
3. Update `.github/versions.yml` with the new version and commit.
4. Update the tracked version at the top of this file.
5. Add, amend, or remove divergence entries as the port requires.
