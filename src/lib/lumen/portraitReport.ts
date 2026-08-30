// Lumen Self-Portrait report serializers — pure, dependency-free, testable.
//
// Turn the narrated description plus any Q&A into a shareable report in several
// formats. Deliberately NON-CLINICAL: a personal-development reflection, never a
// diagnosis or a verdict. The HTML doubles as the source for the client-side PDF
// (via renderHtmlToPdf) and the Word (.doc) export.

export type PortraitQA = { question: string; answer: string }

/** A label/value pair for one score row. */
export type PortraitScoreRow = { label: string; value: number }

export type PortraitReportInput = {
  /** One-line headline from the composed portrait. */
  headline?: string
  /** The narrated description (markdown-ish text). */
  description: string
  /** Any questions the user asked and their answers, oldest first. */
  qa?: PortraitQA[]
  /** Instruments the portrait rests on, e.g. ["PRISM", "DISC"]. */
  instruments?: string[]
  /** One-line coverage note. */
  coverage?: string
  /** Non-clinical framing stamped on the report. */
  disclaimer?: string
  /**
   * The four quadrant means and the eight dimensions they average.
   *
   * Until now the export carried prose only — a user who downloaded their
   * portrait got the narration and none of the numbers it described.
   */
  quadrants?: PortraitScoreRow[]
  dimensions?: PortraitScoreRow[]
  /**
   * Which score variant the numbers are (PRISM stores up to three). Omitted
   * when unrecorded — the report then says so rather than implying one.
   */
  scoreType?: string | null
  /**
   * Introversion / Extroversion. Kept apart from `quadrants` and `dimensions`
   * because it belongs to no quadrant, and a reader scanning a score table has
   * no way to know that unless the document says it.
   */
  orientation?: PortraitScoreRow[]
  /** Descriptive observations from the résumé and bio. Never measurements. */
  evidence?: { source: string; detail: string }[]
  /** The caveat that must travel with `evidence` wherever it is rendered. */
  evidenceNote?: string | null
}

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Stable, filesystem-safe base name. */
export function portraitReportFileBase(): string {
  return "lumen_self-portrait"
}

/**
 * Render a small subset of markdown to HTML: paragraphs, `- ` / `* ` bullets,
 * and `**bold**`. Enough for the LLM's formatting without pulling a markdown
 * dependency into a pure serializer.
 */
function mdToHtml(text: string): string {
  const bold = (s: string) =>
    esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/)
  const out: string[] = []
  for (const block of blocks) {
    const lines = block.split("\n")
    const isList = lines.every((l) => /^\s*[-*]\s+/.test(l) && l.trim().length > 0)
    if (isList) {
      out.push(
        `<ul>${lines
          .map((l) => `<li>${bold(l.replace(/^\s*[-*]\s+/, ""))}</li>`)
          .join("")}</ul>`
      )
    } else {
      out.push(`<p>${bold(block).replace(/\n/g, "<br/>")}</p>`)
    }
  }
  return out.join("\n")
}

/** Plain-text report. */
export function buildPortraitReportText(input: PortraitReportInput): string {
  const L: string[] = []
  L.push("My Self-Portrait")
  if (input.headline) L.push("", input.headline)
  if (input.instruments?.length) L.push("", `Built from: ${input.instruments.join(", ")}`)
  L.push("", "DESCRIPTION", "", input.description.trim())

  if (input.quadrants?.length) {
    L.push("", "QUADRANT SCORES")
    for (const { label, value } of input.quadrants) {
      L.push(`  ${label}: ${Math.round(value)}`)
    }
  }
  if (input.dimensions?.length) {
    L.push(
      "",
      input.scoreType
        ? `BEHAVIOURAL DIMENSIONS (${input.scoreType})`
        : "BEHAVIOURAL DIMENSIONS (score variant not recorded)"
    )
    for (const { label, value } of input.dimensions) {
      L.push(`  ${label}: ${Math.round(value)}`)
    }
  }
  if (input.orientation?.length) {
    L.push("", "ENERGY DIRECTION (belongs to no quadrant)")
    for (const { label, value } of input.orientation) {
      L.push(`  ${label}: ${Math.round(value)}`)
    }
  }
  if (input.evidence?.length) {
    L.push("", "FROM YOUR OWN WORDS")
    if (input.evidenceNote) L.push(input.evidenceNote)
    for (const { source, detail } of input.evidence) {
      L.push(`  [${source}] ${detail}`)
    }
  }

  if (input.qa?.length) {
    L.push("", "QUESTIONS & ANSWERS")
    for (const { question, answer } of input.qa) {
      L.push("", `Q: ${question}`, `A: ${answer.trim()}`)
    }
  }
  if (input.coverage) L.push("", input.coverage)
  if (input.disclaimer) L.push("", input.disclaimer)
  return L.join("\n")
}

/** Self-contained HTML report (source for the PDF and the .doc export). */
export function buildPortraitReportHtml(input: PortraitReportInput): string {
  const instruments = input.instruments?.length
    ? `<p class="meta">Built from: ${input.instruments.map(esc).join(" · ")}</p>`
    : ""
  const qa = input.qa?.length
    ? `<h2>Questions &amp; answers</h2>${input.qa
        .map(
          (x) =>
            `<div class="qa"><p class="q">${esc(x.question)}</p>${mdToHtml(x.answer)}</div>`
        )
        .join("")}`
    : ""
  // Every value below is escaped: évidence details are derived from a
  // user-uploaded résumé, so this is the one path in the report where the input
  // is genuinely untrusted.
  const scoreTable = (rows: PortraitScoreRow[]) =>
    `<table class="scores">${rows
      .map(
        (r) =>
          `<tr><td>${esc(r.label)}</td><td class="v">${Math.round(r.value)}</td></tr>`
      )
      .join("")}</table>`

  const quadrants = input.quadrants?.length
    ? `<h2>Quadrant scores</h2>${scoreTable(input.quadrants)}`
    : ""
  const dimensions = input.dimensions?.length
    ? `<h2>Behavioural dimensions</h2><p class="meta">${
        input.scoreType
          ? `These are your ${esc(input.scoreType)} scores.`
          : "The score variant wasn't recorded for these."
      } Each quadrant above is the average of two of these.</p>${scoreTable(
        input.dimensions
      )}`
    : ""
  const orientation = input.orientation?.length
    ? `<h2>Energy direction</h2><p class="meta">Measured alongside the eight dimensions, but part of no quadrant — neither end is better.</p>${scoreTable(
        input.orientation
      )}`
    : ""
  const evidence = input.evidence?.length
    ? `<h2>From your own words</h2>${
        input.evidenceNote ? `<p class="note">${esc(input.evidenceNote)}</p>` : ""
      }<ul>${input.evidence
        .map((e) => `<li>[${esc(e.source)}] ${esc(e.detail)}</li>`)
        .join("")}</ul>`
    : ""

  const coverage = input.coverage
    ? `<p class="meta">${esc(input.coverage)}</p>`
    : ""
  const disclaimer = input.disclaimer
    ? `<p class="note">${esc(input.disclaimer)}</p>`
    : ""
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,'Times New Roman',serif;color:#1f2937;margin:32px;line-height:1.6}
    h1{color:#6d28d9;font-size:24px;margin:0 0 4px}
    h2{color:#7c3aed;font-size:15px;margin:22px 0 8px;font-family:Arial,Helvetica,sans-serif}
    .headline{font-size:15px;color:#374151;margin:0 0 12px}
    .meta{color:#6b7280;font-size:12px;font-family:Arial,Helvetica,sans-serif}
    p{margin:8px 0}
    ul{margin:8px 0 8px 20px}
    .qa{border-left:3px solid #ede9fe;padding-left:12px;margin:12px 0}
    .qa .q{font-weight:700;color:#4c1d95;margin:0 0 4px}
    .note{margin-top:24px;color:#9ca3af;font-size:11px;font-family:Arial,Helvetica,sans-serif}
    table.scores{border-collapse:collapse;margin:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px}
    table.scores td{padding:3px 16px 3px 0}
    table.scores td.v{text-align:right;font-weight:700;color:#4c1d95}
  </style></head><body>
    <h1>My Self-Portrait</h1>
    ${input.headline ? `<p class="headline">${esc(input.headline)}</p>` : ""}
    ${instruments}
    <h2>Description</h2>
    ${mdToHtml(input.description)}
    ${quadrants}
    ${dimensions}
    ${orientation}
    ${evidence}
    ${qa}
    ${coverage}
    ${disclaimer}
  </body></html>`
}

/**
 * A Word-openable .doc — an HTML document with the msword MIME. Word opens
 * HTML-based .doc files directly, so this needs no docx dependency (matching the
 * repo's existing no-docx export convention). Returns a Blob ready for download.
 */
export function buildPortraitReportDoc(input: PortraitReportInput): Blob {
  const html = buildPortraitReportHtml(input)
  // Word is happiest with an explicit office namespace on the <html> element.
  const withOffice = html.replace(
    "<html>",
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
  )
  return new Blob([withOffice], { type: "application/msword" })
}
