// Single-turn export — the "Export ▾ Word / PDF" link under each Meridian
// answer.
//
// The whole-conversation export (see `./index.ts`) produces a two-document
// bundle with a cover page. A single turn wants neither: it is one answer the
// user wants to keep or paste into a document, so this renders a compact,
// self-contained page with a short header and the turn body.
//
// Both formats share `buildTurnHtml`, so the Word file and the PDF are the same
// document — only the container differs:
//
//   pdf   → the existing html2canvas + jsPDF renderer (`renderHtmlToPdf`)
//   word  → Word's own HTML-document format (`.doc`), which Word, Pages and
//           LibreOffice all open natively. Deliberately no new dependency: a
//           real OOXML writer (`docx`) is ~500 kB for a feature that is one
//           formatted page, and Word renders this HTML with the brand CSS
//           intact.

import { BRAND_CSS, BRAND_TOKENS } from "./brandCss";
import { markdownToHtml } from "./markdown";
import { downloadBlob } from "./index";

export type TurnExportFormat = "word" | "pdf";

export type TurnExportInput = {
  /** Who spoke — "Meridian", "Maven", "You". */
  speaker: string;
  /** Turn body. May contain the Markdown subset the log renderer handles. */
  body: string;
  /** Rendered timestamp as shown in the chat, when known. */
  timestamp?: string;
  /** Specialist agents behind a synthesized Meridian answer. */
  contributingAgents?: string[];
  /** Signed-in user's display name, for the header line. */
  userLabel?: string;
  /** Filename stem; `.doc` / `.pdf` is appended. Defaults to `meridian-turn`. */
  slug?: string;
  /**
   * A figure to place above the body — currently the PRISM Brain Map.
   *
   * Passed as its own field rather than smuggled through `body`, because
   * `body` is markdown and gets escaped; weakening that to let markup through
   * would open the escaping contract for every caller. Embedded as a data-URI
   * `<img>` so Word and the print frame render it without a network fetch and
   * no script can execute.
   */
  figure?: { svg: string; caption?: string };
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The shared document body — identical bytes behind both formats. */
export function buildTurnHtml(input: TurnExportInput): string {
  const { speaker, body, timestamp, contributingAgents, userLabel, figure } = input;
  const figureHtml = figure?.svg
    ? `<div class="figure" style="margin:0 0 14px"><img alt="${esc(
        figure.caption ?? "PRISM Brain Map",
      )}" style="width:100%;max-width:660px" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        figure.svg,
      )}"></div>`
    : "";
  const metaBits = [
    timestamp ? `<div>Time<b>${esc(timestamp)}</b></div>` : "",
    userLabel ? `<div>Participant<b>${esc(userLabel)}</b></div>` : "",
    contributingAgents?.length
      ? `<div>Contributing agents<b>${esc(contributingAgents.join(", "))}</b></div>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(speaker)} — Inspires Genius</title>
<style>
${BRAND_CSS}
/* Single-turn overrides: no cover page, tighter top margin. */
body { padding: 24px 28px; }
.turn-head { border-bottom: 1px solid #d9d9d9; margin-bottom: 14px; padding-bottom: 10px; }
.turn-head .brand { font-size: 10pt; letter-spacing: .08em; text-transform: uppercase; }
.turn-head h1 { font-size: 18pt; margin: 6px 0 2px; }
.turn-head .meta { font-size: 9pt; }
.turn-head .meta div { margin-top: 2px; }
.turn-head .meta b { font-weight: 600; margin-left: 6px; }
</style>
</head>
<body>
<div class="turn-head">
  <div class="brand">Inspires Genius &nbsp;|&nbsp; Conversation Extract</div>
  <h1>${esc(speaker)}</h1>
  <div class="meta">
${metaBits}
  </div>
</div>
${figureHtml}
<div class="msg">${markdownToHtml(body)}</div>
<div class="tagline">&ldquo;${BRAND_TOKENS.tagline}&rdquo;</div>
</body>
</html>`;
}

/** Filesystem-safe stem: lowercase, alphanumerics and dashes only. */
function safeSlug(input: TurnExportInput): string {
  const raw = input.slug ?? `meridian-${input.speaker}`;
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "meridian-turn";
}

/**
 * Render one turn and trigger the download. Throws when the turn is empty (the
 * caller surfaces that as a toast rather than handing the user a blank file).
 */
export async function exportTurn(
  input: TurnExportInput,
  format: TurnExportFormat,
): Promise<void> {
  if (!input.body?.trim()) {
    throw new Error("Nothing to export — this message has no text.");
  }
  const html = buildTurnHtml(input);
  const slug = safeSlug(input);

  if (format === "word") {
    // Word's HTML-document flavour. The BOM matters: without it Word guesses
    // the encoding and mangles the smart quotes the brand CSS relies on.
    const blob = new Blob(["﻿", html], {
      type: "application/msword;charset=utf-8",
    });
    downloadBlob(`${slug}.doc`, blob);
    return;
  }

  // Lazily loaded — jsPDF + html2canvas are ~400 kB and are not needed unless
  // someone actually exports.
  const { renderHtmlToPdf } = await import("./renderPdf");
  const blob = await renderHtmlToPdf(html);
  downloadBlob(`${slug}.pdf`, blob);
}
