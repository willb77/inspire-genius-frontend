// RWO-2 — the ATS-safe Word and PDF files, written from one `ResumeDocument`.
//
// The PDF is a TEXT PDF on US Letter, written line by line with jsPDF's text
// API. Today's résumé PDF (`exportResume.ts`) is an html2canvas image with no
// text layer, so an applicant tracking system reads nothing from it (CSA F2).
// That renderer stays, unedited, for the switch-off path; so does the shared A4
// `pdfWriter`, which four other exports use. This module has its own small
// Letter layout instead of changing either.
//
// Black text, one column, standard headings, the contact line in the body, and a
// plain "Page n of m" — no colour bars, chips, logos or platform branding.

import type { DocBlock, ResumeDocument } from "./resumeDocument"
import { atsFileBase } from "./resumeDocument"

// ── Word ────────────────────────────────────────────────────────────────────

/**
 * RWO-3 — the two layouts. "standard" is RWO-2's, unchanged. "federal" follows
 * USAJOBS's suggestion for its two-page résumé: 10-pt body text, 14-pt name,
 * 0.5-inch margins (USAJOBS help, re-read 2026-11-04).
 */
export const LAYOUTS = {
  standard: { margin: 54, body: 10.5, name: 16, docxBody: 21, docxName: 32, footerFromBottom: 28 },
  federal: { margin: 36, body: 10, name: 14, docxBody: 20, docxName: 28, footerFromBottom: 20 },
} as const

const layoutOf = (doc: ResumeDocument) => LAYOUTS[doc.layout === "federal" ? "federal" : "standard"]

export async function buildAtsDocx(doc: ResumeDocument): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx")
  const L = layoutOf(doc)
  const run = (text: string, o: { bold?: boolean; size?: number } = {}) =>
    new TextRun({ text, bold: o.bold, size: o.size ?? L.docxBody, font: "Calibri" })
  const para = (text: string, o: { bold?: boolean; size?: number; before?: number } = {}) =>
    new Paragraph({ spacing: { before: o.before ?? 0, after: 40 }, children: [run(text, o)] })
  const bullet = (text: string) => new Paragraph({ bullet: { level: 0 }, children: [run(text)] })

  const children: InstanceType<typeof Paragraph>[] = []
  if (doc.name) children.push(para(doc.name, { bold: true, size: L.docxName }))
  if (doc.headline) children.push(para(doc.headline, { size: 22 }))
  if (doc.contactLine) children.push(para(doc.contactLine, { size: 20 }))
  for (const s of doc.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 60 },
        children: [run(s.heading.toUpperCase(), { bold: true, size: 22 })],
      }),
    )
    for (const b of s.blocks) children.push(...docxBlock(b, { para, bullet }))
  }
  // Federal: 0.5-inch margins (720 twips). Every other document keeps Word's default.
  const properties =
    doc.layout === "federal" ? { properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } } } : {}
  return Packer.toBlob(new Document({ sections: [{ ...properties, children }] }))
}

function docxBlock<P>(
  b: DocBlock,
  f: { para: (t: string, o?: { bold?: boolean; before?: number }) => P; bullet: (t: string) => P },
): P[] {
  if (b.kind === "paragraph") return [f.para(b.text)]
  if (b.kind === "bullets") return b.items.map(f.bullet)
  if (b.kind === "lines") return b.items.map((i) => f.para(i))
  const out = [f.para([b.title, b.subtitle].filter(Boolean).join(", "), { bold: true, before: 80 })]
  if (b.dates) out.push(f.para(b.dates))
  return [...out, ...b.bullets.map(f.bullet)]
}

// ── PDF (text, US Letter) ───────────────────────────────────────────────────

/** US Letter in points. */
export const LETTER_W = 612
export const LETTER_H = 792

/** The subset of jsPDF used here. */
export type AtsPdfLike = {
  setFont: (f: string, s?: string) => unknown
  setFontSize: (n: number) => unknown
  setTextColor: (r: number, g: number, b: number) => unknown
  addPage: () => unknown
  setPage: (n: number) => unknown
  getNumberOfPages: () => number
  splitTextToSize: (t: string, w: number) => string[]
  text: (t: string, x: number, y: number) => unknown
  output: (type: "blob") => Blob
}

/**
 * The PDF's built-in Helvetica covers Latin-1, not the typographic punctuation a
 * model writes. Map those to their plain forms so a dash or a curly quote never
 * prints as a stray glyph; letters with accents are Latin-1 and stay.
 */
export function pdfSafe(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•▪●]/g, "-")
    .replace(/\u00a0/g, " ")
}

/** Lay the document out on `pdf` and return its page count (RWO-3: the page warns past a limit). */
export function layoutAtsPdf(pdf: AtsPdfLike, doc: ResumeDocument): number {
  const L = layoutOf(doc)
  const MARGIN = L.margin
  const BODY_W = LETTER_W - MARGIN * 2
  let y = MARGIN
  const need = (h: number) => {
    // Checked BEFORE writing: writing first clips the last line of a page.
    if (y + h > LETTER_H - MARGIN) {
      pdf.addPage()
      y = MARGIN
    }
  }
  const write = (text: string, o: { size?: number; bold?: boolean; indent?: number; gap?: number } = {}) => {
    const size = o.size ?? L.body
    const indent = o.indent ?? 0
    pdf.setFont("helvetica", o.bold ? "bold" : "normal")
    pdf.setFontSize(size)
    pdf.setTextColor(0, 0, 0)
    const lh = size * 1.3
    for (const line of pdf.splitTextToSize(pdfSafe(text), BODY_W - indent)) {
      need(lh)
      pdf.text(line, MARGIN + indent, y + size)
      y += lh
    }
    y += o.gap ?? 0
  }
  /**
   * A bullet is wrapped ONCE, at the width left after its indent and marker, and
   * each line is printed as-is. Wrapping it and then handing the marked lines back
   * to `write` re-wrapped them at a different width, which stranded a word on a
   * line of its own ("…from 2 hours to / 20 / minutes.") — seen on dev, 2026-11-04.
   */
  const BULLET_INDENT = 6
  const BULLET_TEXT = 14
  const bullet = (text: string) => {
    const size = L.body
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(size)
    pdf.setTextColor(0, 0, 0)
    const lh = size * 1.3
    pdf.splitTextToSize(pdfSafe(text), BODY_W - BULLET_TEXT).forEach((line, i) => {
      need(lh)
      if (i === 0) pdf.text("-", MARGIN + BULLET_INDENT, y + size)
      pdf.text(line, MARGIN + BULLET_TEXT, y + size)
      y += lh
    })
  }

  if (doc.name) write(doc.name, { size: L.name, bold: true, gap: 2 })
  if (doc.headline) write(doc.headline, { size: 11, gap: 1 })
  if (doc.contactLine) write(doc.contactLine, { size: 9.5, gap: 4 })
  for (const s of doc.sections) {
    need(30)
    y += 8
    write(s.heading.toUpperCase(), { size: 11, bold: true, gap: 2 })
    for (const b of s.blocks) {
      if (b.kind === "paragraph") write(b.text, { gap: 2 })
      else if (b.kind === "bullets") b.items.forEach(bullet)
      else if (b.kind === "lines") b.items.forEach((i) => write(i))
      else {
        y += 3
        write([b.title, b.subtitle].filter(Boolean).join(", "), { bold: true })
        if (b.dates) write(b.dates, { size: 9.5 })
        b.bullets.forEach(bullet)
      }
    }
  }

  const total = pdf.getNumberOfPages()
  if (total > 1) {
    for (let p = 1; p <= total; p += 1) {
      pdf.setPage(p)
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(8)
      pdf.setTextColor(0, 0, 0)
      pdf.text(`Page ${p} of ${total}`, MARGIN, LETTER_H - L.footerFromBottom)
    }
  }
  return total
}

export function writeAtsPdf(pdf: AtsPdfLike, doc: ResumeDocument): Blob {
  layoutAtsPdf(pdf, doc)
  return pdf.output("blob")
}

export async function buildAtsPdf(doc: ResumeDocument): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  return writeAtsPdf(new jsPDF({ unit: "pt", format: "letter" }) as unknown as AtsPdfLike, doc)
}

/** RWO-3 — how many pages the text PDF of `doc` runs to, without saving it. */
export async function atsPdfPageCount(doc: ResumeDocument): Promise<number> {
  const { jsPDF } = await import("jspdf")
  return layoutAtsPdf(new jsPDF({ unit: "pt", format: "letter" }) as unknown as AtsPdfLike, doc)
}

export async function renderAtsResume(
  doc: ResumeDocument,
  kind: "docx" | "pdf",
  target?: string | null,
  fileKind = "Resume",
): Promise<{ fileName: string; blob: Blob }> {
  const base = atsFileBase(doc.name, target, fileKind)
  const blob = kind === "docx" ? await buildAtsDocx(doc) : await buildAtsPdf(doc)
  return { fileName: `${base}.${kind}`, blob }
}
