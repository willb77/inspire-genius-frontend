// Version 2 — Structured Report.
// Reorganized chronological → logical. All assistant voices consolidate
// to "Meridian · {domain}". Conversational noise stripped. User answers
// receive light typo cleanup; nothing is fabricated, no scores or
// conclusions invented. The cover variant tag reads "Structured Report".
//
// We don't try to be clever about deciding whether a transcript is
// interview-shaped vs. coaching-shaped — the §6.7 Q&A unit reads well
// for both, so we use it uniformly when there's a clear user-question /
// assistant-response pair, and fall back to a single Meridian narrative
// block when the user turn is short scaffolding (greeting, ack, etc.).

import { BRAND_CSS, BRAND_TOKENS } from "./brandCss";
import { markdownToHtml } from "./markdown";
import { cleanUserText, stripAssistantNoise } from "./parseMessages";
import type { TranscriptMeta, TranscriptTurn } from "./types";

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function coverBlock(meta: TranscriptMeta): string {
  return `
<div class="cover">
  <div class="brand">Inspires Genius &nbsp;|&nbsp; Executive Assessment</div>
  <div class="variant">Structured Report</div>
  <h1>${escAttr(meta.sessionSubject)}</h1>
  <div class="sub">${escAttr(meta.assistantDomain ?? "Coaching session")} — reformatted for an executive reader.</div>
  <div class="meta">
    <div>Participant<b>${escAttr(meta.userLabel)}</b></div>
    <div>From<b>${escAttr(meta.fromLabel)}</b></div>
    <div>To<b>${escAttr(meta.toLabel)}</b></div>
    <div>Generated<b>${escAttr(new Date().toLocaleString())}</b></div>
  </div>
  <div class="tagline">&ldquo;${BRAND_TOKENS.tagline}&rdquo;</div>
</div>`;
}

// Group adjacent user→assistant pairs. Trailing turns with no partner
// fall back to a solo block.
type Pair = {
  user?: TranscriptTurn;
  assistants: TranscriptTurn[];
};

function pairTurns(turns: TranscriptTurn[]): Pair[] {
  const out: Pair[] = [];
  let current: Pair | null = null;
  for (const t of turns) {
    if (t.role === "user") {
      if (current) out.push(current);
      current = { user: t, assistants: [] };
    } else {
      if (!current) current = { assistants: [t] };
      else current.assistants.push(t);
    }
  }
  if (current) out.push(current);
  return out;
}

function unifiedAssistantText(pair: Pair): string {
  return pair.assistants.map((a) => stripAssistantNoise(a.body)).filter(Boolean).join("\n\n");
}

function isQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.endsWith("?")) return true;
  // crude heuristic — short opening that reads like a request
  if (t.length < 240 && /^(how|what|why|when|where|who|can|could|would|should|please|tell|explain|show|give)\b/i.test(t)) {
    return true;
  }
  return false;
}

function pairBlock(pair: Pair, idx: number, domainLabel: string): string {
  const userText = pair.user ? cleanUserText(pair.user.body) : "";
  const assistantText = unifiedAssistantText(pair);
  if (!userText && !assistantText) return "";

  // Q&A shape when the user turn reads like a question and there's an
  // assistant reply to assess.
  if (pair.user && assistantText && isQuestion(userText)) {
    const firstLine = userText.split("\n").find((l) => l.trim()) ?? "";
    const label = firstLine.length > 80 ? firstLine.slice(0, 78).trim() + "…" : firstLine;
    return `
<div class="qa">
  <div class="q"><span class="qnum">Q${idx + 1} &middot; ${escAttr(label || "Exchange")}</span>
    <span class="qtext">${markdownToHtml(userText)}</span></div>
  <div class="answer mary"><div class="who">${escAttr(pair.user.speakerRaw)}</div>
    <div class="resp">${markdownToHtml(userText)}</div></div>
  <div class="assess"><div class="who">Meridian &middot; ${escAttr(domainLabel)}</div>
    <div class="resp">${markdownToHtml(assistantText)}</div></div>
</div>`;
  }

  // Non-question exchange — render as a narrative pair without the Q
  // header. User scaffolding ("thanks", "ok") gets folded into the
  // answer block; if no user text at all, just the assistant block.
  const userBlock = userText
    ? `<div class="answer mary"><div class="who">${escAttr(pair.user?.speakerRaw ?? "User")}</div><div class="resp">${markdownToHtml(userText)}</div></div>`
    : "";
  const assistBlock = assistantText
    ? `<div class="assess"><div class="who">Meridian &middot; ${escAttr(domainLabel)}</div><div class="resp">${markdownToHtml(assistantText)}</div></div>`
    : "";
  return `<div class="qa">${userBlock}${assistBlock}</div>`;
}

export function buildReportHtml(turns: TranscriptTurn[], meta: TranscriptMeta): string {
  const pairs = pairTurns(turns);
  const domain = meta.assistantDomain ?? "Coaching";
  const pairsHtml = pairs.map((p, i) => pairBlock(p, i, domain)).join("\n");

  // Setup / context block
  const setup = `
<div class="part-label">Setup</div>
<h2 class="part">Context</h2>
<p class="lead">Reorganized for an executive reader. Conversational scaffolding removed; all assistant turns attributed to Meridian.</p>
<div class="context"><table>
  <tr><td class="k">Session subject</td><td class="v">${escAttr(meta.sessionSubject)}</td></tr>
  <tr><td class="k">Participant</td><td class="v">${escAttr(meta.userLabel)}</td></tr>
  <tr><td class="k">Date range</td><td class="v">${escAttr(meta.fromLabel)} → ${escAttr(meta.toLabel)}</td></tr>
  <tr><td class="k">Exchanges</td><td class="v">${pairs.length}</td></tr>
</table></div>`;

  const exchangesPart = `
<div class="part-label">Part 1</div>
<h2 class="part">Exchanges</h2>
<p class="lead">Each exchange below pairs the participant's question with Meridian's response, noise stripped.</p>
${pairsHtml}`;

  const disclaimer = `
<div class="disclaimer"><b>Decision ownership.</b> This report provides structured input from the Inspires Genius platform. It is designed to inform, not replace, your judgment.</div>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${escAttr(meta.sessionSubject)} — Structured Report</title>
<style>${BRAND_CSS}</style>
</head><body>
${coverBlock(meta)}
<div class="body-page">
  ${setup}
  ${exchangesPart}
  ${disclaimer}
</div>
</body></html>`;
}
