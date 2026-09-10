# Rust reference cross-validation (Phase 1.4)

Replays `tests/vectors/vectors.json` against `bc-lifehash` 0.1.0 (the
tracked commit, via a path dependency on `Rust/bc-lifehash-rust`).

```sh
cd tests/rust-validation
cargo run --release -- ../vectors/vectors.json
```

Each vector is `w×h:sha256(pixels)`; both sides must agree exactly.
Rejections (invalid module size or digest length) are class E1: both
sides reject, the reference by panic. Exit 0 iff no mismatch. Not wired
into CI; a manual gate at phase boundaries.
