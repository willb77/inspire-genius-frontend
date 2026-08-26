/**
 * Exports for a Character Lab profile.
 *
 * `docx` is imported dynamically, as in `exportResearch` — it is a large
 * dependency and this page is one super-admin surface. A static import would
 * put it in the entry bundle for every user of the app.
 *
 * CSV content is produced server-side (one column contract, shared with
 * `scripts/reshape_prism.py`) and only saved here. Nothing in this file
 * invents a score.
 */
import { downloadBlob } from "@/lib/exportTranscript"
import type {
  DerivedQuadrant,
  Rubric,
  ScoreByType,
  ScoreType,
} from "@/types/character-lab"

export type ProfileExportPayload = {
  name: string
  source: string
  notice: string
  reading: string
  analysis: string
  colours: DerivedQuadrant[]
  scores: Record<string, ScoreByType>
  evidence: Record<string, string>
  rubric: Rubric | undefined
  scoreType: ScoreType
}

export function profileFileStem(name: string): string {
  const slug = name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")
  return `PRISM_Character_${slug || "profile"}`
}

/** Save CSV text the API produced. Kept separate so the caller cannot pass a hand-built string. */
export function saveCsv(filename: string, content: string): void {
  downloadBlob(filename, new Blob([content], { type: "text/csv;charset=utf-8" }))
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1$2")
    .replace(/`(.+?)`/g, "$1")
}

/**
 * Build the Word document.
 *
 * The score tables carry the DEFINITION of each scale next to its number, not
 * just the label. A table of eighty-eight bare numbers is unreadable by anyone
 * who does not already know the instrument, and reading a scale from its name
 * is the specific error this whole surface exists to avoid.
 */
export async function exportProfileWord(payload: ProfileExportPayload): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
  } = await import("docx")

  const cell = (text: string, opts: { bold?: boolean; width?: number } = {}) =>
    new TableCell({
      width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: opts.bold, size: 18 })],
        }),
      ],
    })

  const children: InstanceType<typeof Paragraph>[] = []
  const push = (...items: unknown[]) => children.push(...(items as InstanceType<typeof Paragraph>[]))

  push(
    new Paragraph({ text: payload.name, heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [
        new TextRun({
          text: payload.source ? `${payload.source} — PRISM character profile` : "PRISM character profile",
          italics: true,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: payload.notice, bold: true, size: 18 })],
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({ text: "" }),
  )

  if (payload.reading) {
    push(
      new Paragraph({ text: "First reading", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: payload.reading }),
      new Paragraph({ text: "" }),
    )
  }

  if (payload.colours.length) {
    push(new Paragraph({ text: `Brain map (${payload.scoreType})`, heading: HeadingLevel.HEADING_1 }))
    push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [cell("Colour", { bold: true, width: 18 }), cell("Score", { bold: true, width: 12 }), cell("Band", { bold: true, width: 20 }), cell("Measures", { bold: true, width: 50 })],
          }),
          ...payload.colours.map((q) =>
            new TableRow({
              children: [
                cell(q.name),
                cell(String(q.value)),
                cell(q.band),
                cell(QUADRANT_MEANING[q.name] ?? ""),
              ],
            }),
          ),
        ],
      }),
      new Paragraph({ text: "" }),
    )
  }

  if (payload.analysis) {
    push(new Paragraph({ text: "Analysis", heading: HeadingLevel.HEADING_1 }))
    for (const raw of payload.analysis.split(/\r?\n/)) {
      const line = raw.trimEnd()
      if (!line.trim()) {
        push(new Paragraph({ text: "" }))
        continue
      }
      const heading = /^(#{1,4})\s+(.*)$/.exec(line)
      if (heading) {
        const level = heading[1].length
        push(
          new Paragraph({
            text: stripInlineMarkdown(heading[2]),
            heading: level <= 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          }),
        )
        continue
      }
      const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
      if (bullet) {
        push(new Paragraph({ text: stripInlineMarkdown(bullet[1]), bullet: { level: 0 } }))
        continue
      }
      push(new Paragraph({ children: [new TextRun(stripInlineMarkdown(line))] }))
    }
    push(new Paragraph({ text: "" }))
  }

  // Scores, one table per battery, definitions alongside.
  for (const group of payload.rubric?.groups ?? []) {
    const rows = group.dimensions.filter((d) => payload.scores[d.key])
    if (!rows.length) continue
    push(
      new Paragraph({ text: group.group, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun({ text: group.definition, italics: true, size: 18 })] }),
    )
    push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell("Scale", { bold: true, width: 20 }),
              cell("Score", { bold: true, width: 10 }),
              cell("What it measures", { bold: true, width: 38 }),
              cell("Why this score", { bold: true, width: 32 }),
            ],
          }),
          ...rows.map((d) => {
            const byType = payload.scores[d.key]
            const value = byType[payload.scoreType] ?? byType.Underlying
            return new TableRow({
              children: [
                cell(d.label),
                cell(value === undefined ? "—" : String(value)),
                cell(d.measures),
                cell(payload.evidence[d.key] ?? ""),
              ],
            })
          }),
        ],
      }),
      new Paragraph({ text: "" }),
    )
  }

  const doc = new Document({ sections: [{ children: children as never }] })
  const blob = await Packer.toBlob(doc)
  downloadBlob(`${profileFileStem(payload.name)}.docx`, blob)
}

/**
 * What each quadrant actually measures.
 *
 * Spelled out wherever a colour is printed, because the names mislead: Gold
 * reads as "discipline" and Green as "patience", and neither is what the
 * pairing measures.
 */
export const QUADRANT_MEANING: Record<string, string> = {
  Green: "Innovating + Initiating — generating ideas and starting things",
  Blue: "Supporting + Coordinating — helping others and building agreement",
  Red: "Focusing + Delivering — driving at an objective and pressing for the result",
  Gold: "Finishing + Evaluating — completing work and checking it before committing",
}
