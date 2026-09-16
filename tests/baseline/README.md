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
Baseline sha256: 0f9607cc2a633220826dfee54dd01d6721319cde16ab3cba4851730eec348ac1
