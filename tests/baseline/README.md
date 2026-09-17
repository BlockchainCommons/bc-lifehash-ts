# Frozen build of the previous surface

`lifehash-baseline.mjs` is the self-contained ESM bundle of `@blockchaincommons/lifehash` built from
commit `63773b9a73b1d4fa700c6d6d105be7dfdda9a3b1`, the reference for the pixel wire. Its one sibling dependency,
`@blockchaincommons/crypto`, is INLINED from that package's own frozen
bundle, so this bundle keeps the earlier behaviour of `sha256` after crypto
changes.
`lifehash-baseline.d.mts` is the public surface at that commit.

`tests/differential.test.ts` runs every corpus recipe through this bundle and
the working tree and asserts identical outcomes; it pins the sha256 below so
an accidental rebuild cannot turn the differential into a self-comparison.

Baseline commit: 63773b9a73b1d4fa700c6d6d105be7dfdda9a3b1
Baseline sha256: 235f34ae85a8060dcd3cc9f0132c97198f6b4764af5b90b840865a0d1912b444
