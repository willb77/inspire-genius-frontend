#!/usr/bin/env node
// I18N-3 translation pipeline. Anthropic SDK direct (never Bedrock), Message Batches API.
//
//   node scripts/i18n/translate.mjs                 dry run (default): plan + ESTIMATED cost, no network, no key needed
//   node scripts/i18n/translate.mjs --dry-run       same
//   node scripts/i18n/translate.mjs --yes           submit the batch, wait, write results (spends money; needs ANTHROPIC_API_KEY in the environment)
//
//   node scripts/i18n/translate.mjs --resume        pick up the batch saved at submit time (no new batch); optional --batch <id>
//
//   --lang es,fr   limit languages (default: es fr pt it pl cs)    --ns common,chat   limit namespaces
//   --limit N      cap the number of keys per language (for a small pilot)
//
// Translates ONLY keys that are missing from the target language or marked "placeholder" in
// scripts/i18n/_review.json. A key marked "reviewed" is never touched. Absent from _review.json
// means "shipped, state unknown": translated only if the key is missing outright.
// Written keys are recorded as "machine" in _review.json. Output is validated: a result whose
// {{placeholders}} differ from English is rejected and reported, never written.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  HERE, LOCALES, TARGET_LANGS, listNamespaces, loadFlat, readJsonFile, samePlaceholders,
  pluralBases, requiredPluralForms, isAllowedIdentical,
} from "./lib.mjs";

const MODEL = "claude-sonnet-5-5";
// USD per million tokens, claude-sonnet-5-5 (claude-api skill table cached 2026-11-03). Batch API = 50% of these.
const PRICE = { input: 2.0, output: 10.0, cacheRead: 0.1, batchFactor: 0.5 };
const CHUNK = 60; // keys per batch request
// LOCAL ESTIMATE ONLY (no token-count API call is made): ~3.5 chars/token for English/Latin UI text,
// ~4.2 for the JSON envelope; output is the target language, which tokenises worse (x1.6 vs English).
const CHARS_PER_TOKEN = 3.5;
const OUTPUT_EXPANSION = 1.6;
const THINKING_ALLOWANCE = 1.25; // effort=low adaptive thinking: add 25% to output
// PRISM terms the owner has not decided on (glossary.json owner_decision_pending): never translated.
const PRISM_HOLD = ["Green", "Blue", "Red", "Gold", "Innovating", "Initiating", "Supporting", "Coordinating", "Focusing", "Delivering", "Finishing", "Evaluating"];

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const EXECUTE = flag("--yes") && !flag("--dry-run");
// Where a submitted batch is remembered. Outside the repo on purpose; override with I18N_STATE.
const STATE_PATH = process.env.I18N_STATE ?? join(process.env.HOME ?? ".", ".i18n_batch_state.json");
const langs = opt("--lang")?.split(",") ?? TARGET_LANGS;
const onlyNs = opt("--ns")?.split(",");
const perLangLimit = opt("--limit") ? Number(opt("--limit")) : Infinity;

const glossary = readJsonFile(join(HERE, "glossary.json"), {});
const allow = readJsonFile(join(HERE, "allow_identical.json"), {});
const REVIEW_PATH = join(HERE, "_review.json");
const review = readJsonFile(REVIEW_PATH, {});
const ctx = { doNotTranslate: new Set(glossary.do_not_translate ?? []), allowValues: new Set(allow.values ?? []) };

export function planWork() {
  const plan = {};
  for (const lang of langs) {
    if (!TARGET_LANGS.includes(lang)) throw new Error(`language ${lang} is outside the gated set ${TARGET_LANGS}`);
    const items = [];
    for (const ns of listNamespaces()) {
      if (onlyNs && !onlyNs.includes(ns)) continue;
      const en = loadFlat("en", ns);
      const t = loadFlat(lang, ns) ?? {};
      const bases = pluralBases(en);
      const req = requiredPluralForms(lang);
      const consider = [];
      for (const [k, v] of Object.entries(en)) consider.push([k, v, k]);
      // Plural forms the language needs but English lacks (pl/cs few/many): source = English _other.
      for (const base of bases) for (const c of req) {
        const k = `${base}_${c}`;
        if (!(k in en) && !(k in t) && `${base}_other` in en) consider.push([k, en[`${base}_other`], `${base}_other`]);
      }
      for (const [k, v] of consider) {
        const id = `${lang}/${ns}/${k}`;
        if (review[id] === "reviewed") continue;
        const isPlural = /_(zero|one|two|few|many|other)$/.test(k) && bases.has(k.replace(/_[a-z]+$/, ""));
        const missing = !(k in t);
        if (missing && isPlural && !req.includes(k.split("_").pop())) continue; // form the language does not use
        if (!missing && review[id] !== "placeholder") continue;
        if (ctx.doNotTranslate.has(v.trim()) || PRISM_HOLD.includes(v.trim()) || isAllowedIdentical(v, ctx)) continue;
        items.push({ id, ns, key: k, source: v });
      }
    }
    plan[lang] = items.slice(0, perLangLimit);
  }
  return plan;
}

function styleGuide(lang) {
  const f = join(HERE, "..", "..", "docs", "i18n", "style", `${lang}.md`);
  return existsSync(f) ? readFileSync(f, "utf8") : "";
}

export function systemPrompt(lang) {
  return [
    `You translate UI strings for Inspire Genius, an AI coaching platform, from English into the language with code "${lang}".`,
    "Rules:",
    "- Follow the style guide below exactly (register, punctuation, number and date conventions).",
    "- Keep every {{placeholder}} byte-for-byte, with the same count; never translate text inside {{ }}.",
    "- Never translate these names; keep them exactly as written: " + (glossary.do_not_translate ?? []).join(", ") + ".",
    "- The PRISM colour names and behaviour labels are undecided: keep these English words verbatim wherever they appear: " + PRISM_HOLD.join(", ") + ".",
    "- Use these fixed renderings when a string is exactly the English word: " + JSON.stringify(glossary.fixed ?? {}) + ".",
    "- Preserve HTML tags, markdown, punctuation, line breaks and leading/trailing spaces.",
    "- Plural keys: key_one / key_other / key_few / key_many are CLDR forms; translate each into the form named by its suffix, for that language.",
    "- Output ONLY one JSON object mapping each input key to its translation. No commentary, no code fence.",
    "",
    `STYLE GUIDE (${lang}):`,
    styleGuide(lang),
  ].join("\n");
}

function userPrompt(chunk) {
  const o = {};
  for (const it of chunk) o[it.id] = it.source;
  return "Translate the values of this JSON object. Keep the keys unchanged.\n" + JSON.stringify(o, null, 1);
}

function chunks(items) {
  const out = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

const tok = (s) => Math.ceil(s.length / CHARS_PER_TOKEN);
const usd = (inTok, outTok, cachedInTok = 0) =>
  ((inTok - cachedInTok) * PRICE.input + cachedInTok * PRICE.cacheRead + outTok * PRICE.output) / 1e6 * PRICE.batchFactor;

function estimate(plan) {
  const rows = [];
  let tIn = 0, tOut = 0, tUsd = 0, tUsdNoCache = 0;
  for (const [lang, items] of Object.entries(plan)) {
    const sys = tok(systemPrompt(lang));
    let inT = 0, outT = 0, cachedT = 0, n = 0;
    chunks(items).forEach((c, idx) => {
      const u = tok(userPrompt(c));
      inT += sys + u; n++;
      if (idx > 0) cachedT += sys; // best-effort: later requests may read the cached system prompt
      outT += Math.ceil(tok(JSON.stringify(Object.fromEntries(c.map((x) => [x.id, x.source])))) * OUTPUT_EXPANSION * THINKING_ALLOWANCE);
    });
    const cost = usd(inT, outT, cachedT), costNoCache = usd(inT, outT, 0);
    rows.push({ lang, keys: items.length, requests: n, inT, outT, cost, costNoCache });
    tIn += inT; tOut += outT; tUsd += cost; tUsdNoCache += costNoCache;
  }
  return { rows, tIn, tOut, tUsd, tUsdNoCache };
}

function printEstimate(plan) {
  const e = estimate(plan);
  console.log(`Model ${MODEL}, Message Batches (50% discount), effort low. ESTIMATE from a local ${CHARS_PER_TOKEN} chars/token approximation; no token-count call was made.`);
  console.log("lang   keys  requests   in-tokens  out-tokens   est $ (cache read)   est $ (no cache)");
  for (const r of e.rows)
    console.log(`${r.lang.padEnd(5)} ${String(r.keys).padStart(5)} ${String(r.requests).padStart(9)} ${String(r.inT).padStart(11)} ${String(r.outT).padStart(11)} ${("$" + r.cost.toFixed(2)).padStart(19)} ${("$" + r.costNoCache.toFixed(2)).padStart(18)}`);
  console.log(`TOTAL ${String(e.rows.reduce((n, r) => n + r.keys, 0)).padStart(5)} ${String(e.rows.reduce((n, r) => n + r.requests, 0)).padStart(9)} ${String(e.tIn).padStart(11)} ${String(e.tOut).padStart(11)} ${("$" + e.tUsd.toFixed(2)).padStart(19)} ${("$" + e.tUsdNoCache.toFixed(2)).padStart(18)}`);
  return e;
}

function setDeep(obj, path, value) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof o[path[i]] !== "object" || o[path[i]] === null) o[path[i]] = {};
    o = o[path[i]];
  }
  o[path[path.length - 1]] = value;
}

function parseJsonObject(text) {
  const s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(s);
}

async function run(plan) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set in the environment. Nothing was sent.");
    process.exit(2);
  }
  // Imported only on the paid path so the dry run needs neither the SDK nor a key.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY; the value is never logged

  const requests = [];
  const index = {};
  for (const [lang, items] of Object.entries(plan)) {
    chunks(items).forEach((c, i) => {
      const custom_id = `${lang}_${i}`;
      index[custom_id] = { lang, items: c };
      requests.push({
        custom_id,
        params: {
          model: MODEL,
          max_tokens: 16000,
          output_config: { effort: "low" },
          system: [{ type: "text", text: systemPrompt(lang), cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userPrompt(c) }],
        },
      });
    });
  }
  if (!requests.length) { console.log("Nothing to translate."); return; }
  const batch = await client.messages.batches.create({ requests });
  // Saved at once, OUTSIDE the repo (the worktree must stay clean), so a closed window or a crash
  // loses nothing: `--resume` picks the batch up by id. Holds the batch id and the English sources only, never the key.
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify({ batchId: batch.id, submittedAt: new Date().toISOString(), langs, index }, null, 1) + "\n");
  console.log(`batch ${batch.id} submitted (${requests.length} requests). State saved to ${STATE_PATH}`);
  console.log("If this window closes, re-run with --resume (no new batch, no new charge).");
  await finish(client, batch.id, index);
}

export async function finish(client, batchId, index) {
  let batch = await client.messages.batches.retrieve(batchId);
  while (batch.processing_status !== "ended") {
    await new Promise((r) => setTimeout(r, 30000));
    try {
      batch = await client.messages.batches.retrieve(batchId);
    } catch (e) {
      console.log(`  retrieve failed (${e?.status ?? e?.message ?? e}); retrying`); // a network blip must not end the wait
      continue;
    }
    console.log(`  status ${batch.processing_status}`, batch.request_counts);
  }
  console.log("batch ended", batch.request_counts);

  // Raw results go to disk before anything is parsed, so a bug below can never cost a second charge.
  const rawPath = STATE_PATH.replace(/\.json$/, `.${batchId}.results.jsonl`);
  const raw = [];
  for await (const entry of await client.messages.batches.results(batchId)) raw.push(JSON.stringify(entry));
  writeFileSync(rawPath, raw.join("\n") + "\n");
  console.log(`raw results saved to ${rawPath} (${raw.length} entries)`);

  const written = {}, rejected = [];
  const loaded = {};
  for (const line of raw) {
    const entry = JSON.parse(line);
    const meta = index[entry.custom_id];
    if (!meta) continue;
    if (entry.result.type !== "succeeded") { rejected.push(`${entry.custom_id}: ${entry.result.type}`); continue; }
    const msg = entry.result.message;
    if (msg.stop_reason !== "end_turn") { rejected.push(`${entry.custom_id}: stop_reason ${msg.stop_reason}`); continue; }
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    let out;
    try { out = parseJsonObject(text); } catch { rejected.push(`${entry.custom_id}: unparseable JSON`); continue; }
    for (const it of meta.items) {
      const v = out[it.id];
      if (typeof v !== "string" || !v.trim()) { rejected.push(`${it.id}: no translation`); continue; }
      if (!samePlaceholders(it.source, v)) { rejected.push(`${it.id}: placeholder mismatch`); continue; }
      const [lang, ns, ...rest] = it.id.split("/");
      const file = join(LOCALES, lang, `${ns}.json`);
      loaded[file] ??= existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
      setDeep(loaded[file], rest.join("/").split("."), v);
      review[it.id] = "machine";
      written[lang] = (written[lang] ?? 0) + 1;
    }
  }
  for (const [file, obj] of Object.entries(loaded)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
  }
  writeFileSync(REVIEW_PATH, JSON.stringify(Object.fromEntries(Object.entries(review).sort()), null, 1) + "\n");
  console.log("written:", written);
  if (rejected.length) console.log(`${rejected.length} rejected (not written):\n  ` + rejected.slice(0, 100).join("\n  "));
}

async function resume() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set in the environment. Nothing was sent.");
    process.exit(2);
  }
  let batchId = opt("--batch"), index;
  if (existsSync(STATE_PATH)) {
    const state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    batchId ??= state.batchId;
    index = state.index;
    console.log(`Resuming batch ${batchId} (submitted ${state.submittedAt}). No new batch is created.`);
  } else if (batchId) {
    // A batch submitted before this change has no saved state. The plan is deterministic for an untouched
    // worktree, so rebuild the same chunks (custom ids lang_i) and map the results onto them. Pass the same --lang.
    index = {};
    for (const [lang, items] of Object.entries(planWork())) chunks(items).forEach((c, i) => { index[`${lang}_${i}`] = { lang, items: c }; });
    console.log(`No saved state; rebuilt ${Object.keys(index).length} request ids from the plan for batch ${batchId}.`);
  } else {
    console.error(`No saved batch at ${STATE_PATH} and no --batch <id>. Nothing to resume.`);
    process.exit(2);
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  await finish(new Anthropic(), batchId, index);
}

const isMain = import.meta.url === new URL(process.argv[1], "file://").href || process.argv[1]?.endsWith("translate.mjs");
if (isMain && flag("--resume")) {
  await resume();
} else if (isMain) {
  const plan = planWork();
  printEstimate(plan);
  if (!EXECUTE) {
    console.log("\nDRY RUN: nothing sent. Re-run with --yes to submit the batch (spends money).");
  } else {
    await run(plan);
  }
}
