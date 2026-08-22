/**
 * Export a Sage research result to Word, PDF, Markdown, Excel or email.
 *
 * Every heavy renderer (`docx`, `jspdf`, `html2canvas`, `xlsx`) is imported
 * dynamically inside the function that needs it, so opening the Research page
 * does not pull ~1.5 MB of export machinery into the entry bundle. The same
 * lazy pattern is used by `lib/exportTranscript/renderPdf.ts`.
 */
import { downloadBlob } from "@/lib/exportTranscript"
import { markdownToHtml } from "@/lib/exportTranscript/markdown"
import { BRAND_CSS } from "@/lib/exportTranscript/brandCss"

export interface ResearchExportPayload {
  /** The question the operator asked. */
  question: string
  /** Sage's answer. Markdown. */
  answer: string
  agentName: string
  /** 0–1 as returned by the agent. */
  confidence: number
  suggestedNext: string | null
  metadata: Record<string, unknown>
  /** Document tags the query was narrowed to, if any. */
  filterTags: string[]
  summarizeOnly: boolean
  generatedAt: Date
}

/** `Research_what-does-prism-measure_2026-08-22` — safe on every filesystem. */
export function researchFileStem(payload: ResearchExportPayload): string {
  const slug = payload.question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  const date = payload.generatedAt.toISOString().slice(0, 10)
  return `Research_${slug || "untitled"}_${date}`
}

function confidencePct(payload: ResearchExportPayload): string {
  return `${Math.round((payload.confidence ?? 0) * 100)}%`
}

/**
 * The provenance block every export carries.
 *
 * Exports outlive the screen they came from, so an exported answer that does
 * not say which agent produced it, when, at what confidence, and over which
 * document filter is not auditable — and these get forwarded to people who
 * never saw the query.
 */
function metaRows(payload: ResearchExportPayload): Array<[string, string]> {
  return [
    ["Question", payload.question],
    ["Agent", payload.agentName],
    ["Confidence", confidencePct(payload)],
    ["Generated", payload.generatedAt.toLocaleString()],
    ["Document filter", payload.filterTags.length ? payload.filterTags.join(", ") : "None (whole corpus)"],
    ["Mode", payload.summarizeOnly ? "Summarise passages only" : "Full analysis"],
    ...(payload.suggestedNext ? ([["Suggested next", payload.suggestedNext]] as Array<[string, string]>) : []),
  ]
}

// ─── Markdown ──────────────────────────────────────────────────────

export function buildResearchMarkdown(payload: ResearchExportPayload): string {
  const meta = metaRows(payload)
    .map(([k, v]) => `- **${k}:** ${v}`)
    .join("\n")
  return [
    `# Research — ${payload.question}`,
    "",
    meta,
    "",
    "---",
    "",
    payload.answer,
    "",
  ].join("\n")
}

export function exportResearchMarkdown(payload: ResearchExportPayload): void {
  const blob = new Blob([buildResearchMarkdown(payload)], {
    type: "text/markdown;charset=utf-8",
  })
  downloadBlob(`${researchFileStem(payload)}.md`, blob)
}

// ─── HTML (shared by PDF) ──────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildResearchHtml(payload: ResearchExportPayload): string {
  const rows = metaRows(payload)
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:left;padding:4px 12px 4px 0;vertical-align:top;white-space:nowrap">${escapeHtml(
          k,
        )}</th><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
    )
    .join("")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BRAND_CSS}</style></head><body>
    <h1>Research</h1>
    <table style="border-collapse:collapse;margin-bottom:20px;font-size:12px">${rows}</table>
    <hr />
    <div>${markdownToHtml(payload.answer)}</div>
  </body></html>`
}

// ─── PDF ───────────────────────────────────────────────────────────

export async function exportResearchPdf(payload: ResearchExportPayload): Promise<void> {
  const { renderHtmlToPdf } = await import("@/lib/exportTranscript/renderPdf")
  const blob = await renderHtmlToPdf(buildResearchHtml(payload))
  downloadBlob(`${researchFileStem(payload)}.pdf`, blob)
}

// ─── Word (.docx) ──────────────────────────────────────────────────

/**
 * Flatten the answer's Markdown into docx paragraphs.
 *
 * Deliberately shallow — headings, bullets and paragraphs. `docx` has no
 * Markdown parser, and a half-implemented one that silently drops content
 * would be worse than plainly rendered text: the operator would not know
 * anything was missing.
 */
async function markdownToDocxParagraphs(markdown: string) {
  const { Paragraph, HeadingLevel, TextRun } = await import("docx")
  const out: InstanceType<typeof Paragraph>[] = []
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      out.push(new Paragraph({ text: "" }))
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      out.push(
        new Paragraph({
          text: heading[2],
          heading:
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
                ? HeadingLevel.HEADING_2
                : level === 3
                  ? HeadingLevel.HEADING_3
                  : HeadingLevel.HEADING_4,
        }),
      )
      continue
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      out.push(new Paragraph({ text: stripInlineMarkdown(bullet[1]), bullet: { level: 0 } }))
      continue
    }
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (numbered) {
      out.push(new Paragraph({ text: stripInlineMarkdown(numbered[1]), bullet: { level: 0 } }))
      continue
    }
    out.push(new Paragraph({ children: [new TextRun(stripInlineMarkdown(line))] }))
  }
  return out
}

/** Remove `**`, `*`, `` ` `` markers so they do not print literally in Word. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1$2")
    .replace(/`(.+?)`/g, "$1")
}

export async function exportResearchWord(payload: ResearchExportPayload): Promise<void> {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx")

  const metaParagraphs = metaRows(payload).map(
    ([k, v]) =>
      new Paragraph({
        children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun(v)],
        spacing: { after: 60 },
      }),
  )

  const body = await markdownToDocxParagraphs(payload.answer)

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Research", heading: HeadingLevel.TITLE }),
          ...metaParagraphs,
          new Paragraph({ text: "" }),
          ...body,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(`${researchFileStem(payload)}.docx`, blob)
}

// ─── Excel (.xlsx) ─────────────────────────────────────────────────

/**
 * Two sheets: the provenance block, and the answer split one row per
 * paragraph. A single cell holding the whole answer is unusable in Excel —
 * it renders as one clipped line.
 */
export async function exportResearchExcel(payload: ResearchExportPayload): Promise<void> {
  const XLSX = await import("xlsx")

  const summary = XLSX.utils.aoa_to_sheet([["Field", "Value"], ...metaRows(payload)])
  summary["!cols"] = [{ wch: 18 }, { wch: 100 }]

  const answerRows = payload.answer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => [i + 1, line])
  const answer = XLSX.utils.aoa_to_sheet([["#", "Line"], ...answerRows])
  answer["!cols"] = [{ wch: 6 }, { wch: 120 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, summary, "Summary")
  XLSX.utils.book_append_sheet(wb, answer, "Answer")

  const array = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer
  downloadBlob(
    `${researchFileStem(payload)}.xlsx`,
    new Blob([array], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  )
}

// ─── Email ─────────────────────────────────────────────────────────

/** `mailto:` bodies are capped by the browser and the OS handler well below
 *  the length of a research answer — Chrome truncates around 2 000 characters
 *  and silently drops the rest. */
const MAILTO_BODY_LIMIT = 1500

export interface EmailResearchResult {
  /** True when the answer did not fit and the full copy was downloaded. */
  truncated: boolean
}

/**
 * Open the operator's mail client with the result.
 *
 * There is no server-side send for this surface, so this composes a draft
 * locally rather than pretending to send. When the answer is too long for a
 * `mailto:` body, the Markdown copy is downloaded alongside so there is a
 * complete artefact to attach — the alternative is a mail that looks whole
 * but stops mid-sentence.
 */
export function emailResearch(payload: ResearchExportPayload): EmailResearchResult {
  const header = metaRows(payload)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")
  const full = `${header}\n\n----\n\n${payload.answer}`
  const truncated = full.length > MAILTO_BODY_LIMIT

  const body = truncated
    ? `${full.slice(0, MAILTO_BODY_LIMIT)}\n\n[...truncated. The full report has been downloaded as ${researchFileStem(payload)}.md — please attach it.]`
    : full

  if (truncated) exportResearchMarkdown(payload)

  const subject = `Research — ${payload.question.slice(0, 120)}`
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return { truncated }
}
