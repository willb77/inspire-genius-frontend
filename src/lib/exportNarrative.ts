/**
 * Word and PDF export for any Character Lab narrative.
 *
 * Four surfaces produce prose — the profile write-up, a multi-character
 * comparison, a scenario play-out, and an answer to a question — and only the
 * first could be exported. Rather than write three more exporters, they share
 * this one: a narrative is a title, a notice, and some markdown sections, and
 * nothing about the comparison needs its own idea of what a heading looks like.
 *
 * Both formats read the SAME parsed markdown (`parseMarkdownBlocks`), so a
 * scenario exported as Word and as PDF cannot disagree about what is a bullet.
 * That was already true of the profile exporters and is the reason the parser
 * was extracted in the first place.
 *
 * `docx` and `jspdf` are both imported dynamically. They are large, this is one
 * super-admin surface, and a static import would put them in the entry bundle
 * for every user of the app.
 */
import { downloadBlob } from '@/lib/exportTranscript'
import { parseMarkdownBlocks } from '@/lib/markdownBlocks'
import { createPdfWriter, writeNotice, type PdfLike } from '@/lib/pdfWriter'
import { SYNTHETIC_NARRATIVE_PREFIX, syntheticFooter } from '@/lib/prismExportLabels'

export type NarrativeSection = {
  /** Optional — the body's own `##` headings are kept either way. */
  heading?: string
  /** Markdown, as the API returned it. */
  body: string
}

export type NarrativeDoc = {
  title: string
  subtitle?: string
  /**
   * The notice about what this document describes. Printed in full at the top
   * of page one in both formats, never referenced or abbreviated.
   *
   * Synthetic for the Character Lab; a real-person notice for a document about
   * a named colleague. See `@/lib/prismExportLabels`.
   */
  notice: string
  /** Label/value pairs printed under the title — the cast, the situation. */
  meta?: { label: string; value: string }[]
  sections: NarrativeSection[]
  /**
   * Filename stem, no extension. Defaults to `PRISM_<Title>`; a real-person
   * export passes `PRISM_Profile_<Name>`.
   */
  fileStem?: string
  /**
   * The footer stamped on every PDF page. Defaults to
   * `<title> — synthetic profile`, which is a false statement about a real
   * colleague, so any real-person caller MUST pass its own.
   */
  footer?: string
}

/** The stem this doc's files are named after. One rule, both formats. */
function docFileStem(payload: NarrativeDoc): string {
  return payload.fileStem ?? narrativeFileStem(payload.title)
}

/**
 * `Sonny Corleone vs Michael Corleone` → `PRISM_Sonny_Corleone_vs_Michael_Corleone`.
 *
 * The prefix is a parameter for the same reason as `profileFileStem`'s: real
 * people's exports must not be filed under the Character Lab's naming.
 */
export function narrativeFileStem(
  title: string,
  prefix: string = SYNTHETIC_NARRATIVE_PREFIX,
): string {
  const slug = title.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return `${prefix}${slug || 'narrative'}`.slice(0, 120)
}

/** Sections with nothing in them are dropped — an empty heading is a lie about coverage. */
function usable(sections: NarrativeSection[]): NarrativeSection[] {
  return sections.filter((s) => (s.body || '').trim().length > 0)
}

export function hasNarrative(doc: NarrativeDoc): boolean {
  return usable(doc.sections).length > 0
}

// ─── Word ───────────────────────────────────────────────────────────────

export async function exportNarrativeWord(payload: NarrativeDoc): Promise<void> {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import('docx')
  const sections = usable(payload.sections)

  const children: unknown[] = [
    new Paragraph({ text: payload.title, heading: HeadingLevel.TITLE }),
  ]
  if (payload.subtitle) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: payload.subtitle, italics: true })] }),
    )
  }
  children.push(new Paragraph({ text: '' }))
  if (payload.notice) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: payload.notice, bold: true, size: 18 })] }),
      new Paragraph({ text: '' }),
    )
  }
  for (const m of payload.meta ?? []) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${m.label}: `, bold: true, size: 20 }),
          new TextRun({ text: m.value, size: 20 }),
        ],
      }),
    )
  }
  if (payload.meta?.length) children.push(new Paragraph({ text: '' }))

  for (const section of sections) {
    if (section.heading) {
      children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }))
    }
    for (const block of parseMarkdownBlocks(section.body)) {
      if (block.kind === 'blank') {
        children.push(new Paragraph({ text: '' }))
      } else if (block.kind === 'heading') {
        children.push(
          new Paragraph({
            text: block.text,
            heading: block.level <= 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          }),
        )
      } else if (block.kind === 'bullet') {
        children.push(new Paragraph({ text: block.text, bullet: { level: 0 } }))
      } else if (block.kind === 'ordered') {
        children.push(new Paragraph({ text: `${block.index}. ${block.text}` }))
      } else {
        children.push(new Paragraph({ children: [new TextRun(block.text)] }))
      }
    }
    children.push(new Paragraph({ text: '' }))
  }

  const doc = new Document({ sections: [{ children: children as never }] })
  downloadBlob(`${docFileStem(payload)}.docx`, await Packer.toBlob(doc))
}

// ─── PDF ────────────────────────────────────────────────────────────────

export async function exportNarrativePdf(payload: NarrativeDoc): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const w = createPdfWriter(new jsPDF({ unit: 'pt', format: 'a4' }) as unknown as PdfLike)
  const sections = usable(payload.sections)

  w.write(payload.title, { size: 22, style: 'bold', gap: 2 })
  if (payload.subtitle) {
    w.write(payload.subtitle, { size: 11, style: 'italic', colour: [75, 85, 99], gap: 10 })
  }
  writeNotice(w, payload.notice)

  for (const m of payload.meta ?? []) {
    w.write(`${m.label}: ${m.value}`, { size: 9, colour: [75, 85, 99], gap: 2 })
  }
  if (payload.meta?.length) w.advance(8)

  for (const section of sections) {
    if (section.heading) {
      w.rule()
      w.write(section.heading, { size: 14, style: 'bold', gap: 6 })
    }
    for (const block of parseMarkdownBlocks(section.body)) {
      if (block.kind === 'blank') {
        w.advance(4)
      } else if (block.kind === 'heading') {
        w.advance(4)
        w.write(block.text, { size: block.level <= 2 ? 12 : 11, style: 'bold', gap: 3 })
      } else if (block.kind === 'bullet') {
        w.write(`•  ${block.text}`, { indent: 10, gap: 2 })
      } else if (block.kind === 'ordered') {
        w.write(`${block.index}.  ${block.text}`, { indent: 10, gap: 2 })
      } else {
        w.write(block.text, { gap: 4 })
      }
    }
    w.advance(8)
  }

  // Page numbers last, once the total is known. The label is the caller's —
  // see NarrativeDoc.footer.
  w.footer(payload.footer ?? syntheticFooter(payload.title))
  downloadBlob(
    `${docFileStem(payload)}.pdf`,
    (w.doc as unknown as { output: (t: string) => Blob }).output('blob'),
  )
}
