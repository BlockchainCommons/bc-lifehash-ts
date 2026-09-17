# Rust reference cross-validation

Replays `tests/vectors/vectors.json` against the `bc-lifehash` reference: the
published `bc-lifehash` 0.1.0 crate from crates.io (sources
`bc-lifehash-rust` commit `081daa0`), the version recorded in
[`.github/versions.yml`](../../.github/versions.yml). Nothing is patched. The
`upstream.yml` workflow opens a tracking issue whenever the reference moves
ahead of that commit.

```sh
cd tests/rust-validation
cargo run --release --locked -- ../vectors/vectors.json
```

Result line on 2026-09-17:

```
1820 vectors - 1777 match, 4 E1 (both reject), 39 js-only, 0 MISMATCH
```

## What is compared

Every recipe (`tests/vectors/recipes.ts`) yields one outcome string on each
side and the two are compared textually: `w×h:sha256(pixels)` for a rendered
image, `throw:<code>` for a rejection. The TypeScript outcome is the vector's
`expect`, materialised by `scripts/generate-vectors.ts` with the working tree;
the reference's is computed by `src/main.rs`.

The corpus (`tests/corpus/corpus.ts`) holds a hand corpus and random inputs at
every version, module size and alpha mode, two larger tilings, the 35 upstream
vectors, 1 000 reference-rendered inputs, and the JavaScript-only rows below.

The run classifies every row:

- **match** — identical outcome on both sides. Every pixel of every rendered
  vector is identical.
- **E1 (both reject)** — the reference panics where the port throws a
  `LifeHashError`: a module size of 0 or below (`InvalidModuleSize`), a digest
  that is not 32 bytes (`InvalidDigestLength`).
- **js-only** — the recipe cannot be expressed with the reference's types (a
  non-integer module size, and the `domain` rows below); counted, not
  compared.
- **MISMATCH** — anything else. Exit status 1.

## JavaScript-only input domain

The reference's types make these inputs inexpressible; the port rejects each
with `LifeHashError` before rendering. The `domain` rows come from
`tests/corpus/domain-cases.ts`.

| Input | Port |
|---|---|
| `version` not one of the five names (`"bogus"`, `"Version2"`, `1`) | `InvalidVersion` |
| `moduleSize` not a positive integer (`0`, `-1`, `1.5`, `NaN`, `Infinity`, `"2"`, `2n`) | `InvalidModuleSize` (the reference panics for `0`; the others cannot be expressed) |
| `moduleSize` whose image would hold more than `2 ** 53 - 1` bytes (e.g. 741 456 for `detailed` RGBA) | `InvalidModuleSize` with `details.max`: a JavaScript `number` cannot count the bytes. Below that, the port allocates and renders as the reference does; when the engine cannot allocate the buffer it throws its own `RangeError`, where the reference aborts |
| digest not 32 bytes | `InvalidDigestLength` (the reference panics) |
| `digest` or `data` not a `Uint8Array` (a string, an array of numbers, an `ArrayBuffer`, an array-like) | `InvalidArgument` |
| `text` not a string | `InvalidArgument` |
| `options` not an object (`null`, a number) | `InvalidArgument` |
| `hasAlpha` not a boolean (`1`, `"yes"`, `0`, `null`) | `InvalidArgument` |

## Mapping equivalences

- `makeFromUtf8`, `makeFromData` and `makeFromDigest` are `make_from_utf8`,
  `make_from_data` and `make_from_digest`. The three trailing parameters are
  an options object, `{ version, moduleSize, hasAlpha }`, with the C++
  reference's defaults (`"version2"`, `1`, `false`); the Rust crate has no
  default arguments. Each function checks its data argument before the
  options, as the reference does.
- `LifeHashVersion` members map to the `Version` variants in order.
  `grayscaleFiducial` is the spelling the C++ command line uses; the
  reference's fixture JSON spells the same version `grayscale_fiducial`.
- A `Uint8Array` from any realm, a `Buffer`, and a `subarray` view are all
  accepted and render as the same bytes would.
- A string containing a lone surrogate is encoded with U+FFFD in its place,
  as `TextEncoder` does; a Rust `&str` cannot contain one.
- `LifeHashImage.channels` records what `hasAlpha` chose; the reference's
  `Image` does not.

## Unreachable difference

If every cell of the age grid held the same value, its normalisation would
divide by zero and every cell would be NaN. The reference then renders black
pixels (its float-to-integer casts saturate NaN to 0); the port's multi-colour
gradient would throw a `TypeError` when it indexes a colour by a NaN segment.
Reaching that state needs an all-alive or all-dead grid after the version's
SHA-256 chaining, that is, a SHA-256 preimage. The all-zero and all-`ff`
digests are in the corpus for every version and match.

## Maintenance

When the reference moves:

1. Review the diff via the link in the `upstream.yml` tracking issue and port
   the relevant changes.
2. Update `.github/versions.yml` and the pin at the top of this file, then the
   `bc-lifehash` pin in `Cargo.toml` (`cargo update -p bc-lifehash`).
3. Regenerate the vectors (`bun run vectors:generate`), run the replay and copy
   the result line above.

A `MISMATCH` is a bug on one side, never a new class. An input only JavaScript
can express is a `domain` row in `tests/corpus/domain-cases.ts` and a js-only
rule in `src/main.rs`, not a difference.

To validate a local checkout of the reference instead of the release, add to
`Cargo.toml`:

```toml
[patch.crates-io]
bc-lifehash = { path = "../../../../../bc-rust/bc-lifehash-rust" }
```
