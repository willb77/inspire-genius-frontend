import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = join(fileURLToPath(import.meta.url), "..", "..");

test("_review.json uses only the three states and gated languages", () => {
  const r = JSON.parse(readFileSync(join(HERE, "_review.json"), "utf8"));
  for (const [id, state] of Object.entries(r)) {
    assert.match(id, /^(es|fr|pt|it|pl|cs)\/[a-z]+\/.+/, id);
    assert.ok(["machine", "reviewed", "placeholder"].includes(state), `${id}: ${state}`);
  }
});

test("seed: every baseline-identical key is 'placeholder' unless a later state replaced it", () => {
  const r = JSON.parse(readFileSync(join(HERE, "_review.json"), "utf8"));
  const b = JSON.parse(readFileSync(join(HERE, "parity_baseline.json"), "utf8"));
  for (const f of Object.values(b.languages)) for (const id of f.identical) assert.ok(id in r, id);
});
