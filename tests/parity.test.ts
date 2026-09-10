import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { lifehash, type LifeHashVersion } from "../src";
import { hexToData } from "../src/hex";
import { sha256 } from "@blockchaincommons/crypto";
import { dataToHex } from "../src/hex";

interface GoldenEntry {
  input_hex: string;
  version: string;
  module_size: number;
  has_alpha: boolean;
  output_sha256: string;
}

const versionMap: Record<string, LifeHashVersion> = {
  version1: "version1",
  version2: "version2",
  detailed: "detailed",
  fiducial: "fiducial",
  grayscale_fiducial: "grayscaleFiducial",
};

const goldenPath = new URL("./fixtures/golden.json", import.meta.url);
const goldenJson = readFileSync(goldenPath, "utf-8");
const golden: GoldenEntry[] = JSON.parse(goldenJson);

describe("LifeHash parity (Rust golden)", () => {
  it("loads at least 1000 fuzz entries", () => {
    expect(golden.length).toBeGreaterThanOrEqual(1000);
  });

  for (const entry of golden) {
    const version = versionMap[entry.version];
    const label = `${entry.version} ${entry.input_hex.slice(0, 16)}…`;
    it(`matches Rust output for ${label}`, () => {
      const data = hexToData(entry.input_hex);
      const image = lifehash(data, {
        version,
        moduleSize: entry.module_size,
        alpha: entry.has_alpha,
      });
      const got = dataToHex(sha256(image.pixels));
      expect(got).toBe(entry.output_sha256);
    });
  }
});
