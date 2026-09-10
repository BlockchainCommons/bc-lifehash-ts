# Frozen baseline build

`lifehash-baseline.mjs` is the self-contained ESM bundle of `@blockchaincommons/lifehash` built from
commit `63773b9a73b1d4fa700c6d6d105be7dfdda9a3b1`, the pre-redesign wire-format reference. Sibling
`@blockchaincommons/*` packages are INLINED from their own frozen baseline
bundles (@blockchaincommons/crypto, @blockchaincommons/rand, @blockchaincommons/envelope, @blockchaincommons/sskr, @blockchaincommons/tags, @blockchaincommons/known-values, @blockchaincommons/components, @blockchaincommons/uniform-resources, @blockchaincommons/shamir), so this bundle keeps the
pre-redesign behaviour of its dependencies after they change.
`lifehash-baseline.d.mts` is the public surface at that commit (Phase 0.5).

`tests/differential.test.ts` runs every corpus recipe through this bundle and
the working tree and asserts identical outcomes; it pins the sha256 below so
an accidental rebuild cannot turn the differential into a self-comparison.

Baseline commit: 63773b9a73b1d4fa700c6d6d105be7dfdda9a3b1
Baseline sha256: 0f9607cc2a633220826dfee54dd01d6721319cde16ab3cba4851730eec348ac1
