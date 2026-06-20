// Version 1 — Conversation Log.
// Chronological, faithful. Every turn rendered as a §6.6 turn block.
// Specialist agent names preserved. Light typo cleanup of *user* text
// only. The cover variant tag reads "Conversation Log".

import { BRAND_CSS, BRAND_TOKENS } from "./brandCss";
import { markdownToHtml } from "./markdown";
import { cleanUserText } from "./parseMessages";
import type { TranscriptMeta, TranscriptTurn } from "./types";

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function coverBlock(meta: TranscriptMeta): string {
  return `
<div class="cover">
  <div class="brand">Inspires Genius &nbsp;|&nbsp; Executive Assessment</div>
  <div class="variant">Conversation Log</div>
  <h1>${escAttr(meta.sessionSubject)}</h1>
  <div class="sub">Full transcript, in original order, in the Inspires Genius house style.</div>
  <div class="meta">
    <div>Participant<b>${escAttr(meta.userLabel)}</b></div>
    <div>From<b>${escAttr(meta.fromLabel)}</b></div>
    <div>To<b>${escAttr(meta.toLabel)}</b></div>
    <div>Generated<b>${escAttr(new Date().toLocaleString())}</b></div>
  </div>
  <div class="tagline">&ldquo;${BRAND_TOKENS.tagline}&rdquo;</div>
</div>`;
}

function turnBlock(turn: TranscriptTurn): string {
  const text = turn.role === "user" ? cleanUserText(turn.body) : turn.body;
  const cls = turn.role === "user" ? "turn user" : "turn agent";
  const tsHtml = turn.timestamp ? `<span class="ts">${escAttr(turn.timestamp)}</span>` : "";
  return `
<div class="${cls}">
  <div class="who">${escAttr(turn.speakerRaw)}${tsHtml}</div>
  <div class="msg">${markdownToHtml(text)}</div>
</div>`;
}

export function buildLogHtml(turns: TranscriptTurn[], meta: TranscriptMeta): string {
  const turnsHtml = turns.map(turnBlock).join("\n");
  const sessionMeta = `
<div class="context"><table>
  <tr><td class="k">Session subject</td><td class="v">${escAttr(meta.sessionSubject)}</td></tr>
  <tr><td class="k">Date range</td><td class="v">${escAttr(meta.fromLabel)} → ${escAttr(meta.toLabel)}</td></tr>
  <tr><td class="k">Messages</td><td class="v">${turns.length}</td></tr>
</table></div>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${escAttr(meta.sessionSubject)} — Conversation Log</title>
<style>${BRAND_CSS}</style>
</head><body>
${coverBlock(meta)}
<div class="body-page">
  <div class="part-label">Conversation Log</div>
  <h2 class="part">${escAttr(meta.sessionSubject)}</h2>
  <p class="lead">Full transcript, in original order, in the Inspires Genius house style.</p>
  ${sessionMeta}
  ${turnsHtml}
</div>
</body></html>`;
}
