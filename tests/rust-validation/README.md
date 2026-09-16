# Rust reference cross-validation

Replays `tests/vectors/vectors.json` against the tracked `bc-lifehash`
release from crates.io (the version in `.github/versions.yml`).

```sh
cd tests/rust-validation
cargo run --release -- ../vectors/vectors.json
```

Each vector is `w×h:sha256(pixels)` or `throw:<code>`. The run classifies
every row:

- **match** — identical outcome on both sides.
- **E1 (both reject)** — the reference panics where the port throws a
  `LifeHashError` (module size 0 or negative, a digest that is not 32
  bytes).
- **js-only** — the recipe cannot be expressed with the reference's types
  (a non-integer module size, and the `domain` rows that probe JavaScript
  argument checks); counted, not compared.
- **MISMATCH** — anything else. Exit status 1.

To validate a local checkout of the reference instead of the release, add
to `Cargo.toml`:

```toml
[patch.crates-io]
bc-lifehash = { path = "../../../../../bc-rust/bc-lifehash-rust" }
```
