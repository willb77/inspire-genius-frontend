#!/usr/bin/env node
// Seeds scripts/i18n/_review.json from parity_baseline.json. Only identical-to-English keys are
// marked "placeholder"; everything else stays absent (unknown/shipped). Never overwrites an existing
// state, and never claims "machine" or "reviewed" for a string whose provenance is not known.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { HERE, readJsonFile } from "./lib.mjs";
const path = join(HERE, "_review.json");
const review = readJsonFile(path, {});
const base = readJsonFile(join(HERE, "parity_baseline.json"), { languages: {} });
let added = 0;
for (const f of Object.values(base.languages)) for (const id of f.identical ?? []) if (!(id in review)) { review[id] = "placeholder"; added++; }
writeFileSync(path, JSON.stringify(Object.fromEntries(Object.entries(review).sort()), null, 1) + "\n");
console.log(`seeded ${added} placeholder entries (${Object.keys(review).length} total)`);
