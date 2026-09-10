/**
 * Golden snapshot (Phase 0.2): dimensions and the SHA-256 of the pixel
 * buffer for the hand corpus at every version, module size and alpha mode,
 * and the outcome for invalid inputs. Reviewable, auto-updatable with -u.
 */
import { describe, it, expect } from "vitest";
import * as src from "../src";
import { materialize, redesignedAdapterFor, recipeName } from "./vectors/recipes";
import { hand } from "./corpus/corpus";

const api = redesignedAdapterFor(src);

describe("golden: hand corpus", () => {
  it("every version × module size × alpha, plus rejections", () => {
    const rows = [...hand()].map((r) => `${recipeName(r)}: ${materialize(api, r)}`);
    expect(rows.length).toBeGreaterThan(300);
    expect(rows).toMatchSnapshot();
  });
});
