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
builds `bc-lifehash` at the tracked commit and replays
`tests/vectors/vectors.json` (745 vectors: every version × module size ×
alpha mode over hand-picked and random inputs), comparing image dimensions
and the SHA-256 of the pixel buffer. The current run: **745 match, 0
expected divergences, 0 mismatches.**

## 1. True behavioral divergences

_None._ Every pixel of every vector is identical.

## 2. JS-only input domain

- **Invalid module sizes** (`0`, negative, non-integer) and **digests that
  are not 32 bytes** throw `LifeHashError` (`InvalidModuleSize`,
  `InvalidDigestLength`). The reference takes a `usize` and a `&[u8]`; a
  non-integer size cannot be expressed and a wrong-length digest panics.
  The harness treats both as rejections.

## 3. Mapping equivalences

- `lifehash(string)` is `make_from_utf8`; `lifehash(Uint8Array)` is
  `make_from_data`; `lifehashFromDigest` is `make_from_digest`.
  `LifeHashVersion` strings map to the `Version` enum in order
  (`lifehashVersionCode`).

## Maintenance

When the upstream reference moves:

1. Review the diff via the link in the `upstream.yml` tracking issue.
2. Port the relevant changes.
3. Update `.github/versions.yml` with the new version and commit.
4. Update the tracked version at the top of this file.
5. Add, amend, or remove divergence entries as the port requires.
