/**
 * PDF export for a Character Lab profile.
 *
 * `jspdf` is imported dynamically for the same reason `docx` is: it is large,
 * and this is one super-admin surface. A static import would put it in the
 * entry bundle for every user of the app.
 *
 * Text is laid out directly rather than rasterised from the DOM. html2canvas is
 * in the tree and would have been fewer lines, but it produces an image of the
 * page: unsearchable, unselectable, blurry at print resolution, and carrying
 * whatever theme the operator happened to be in. A profile is a document, and
 * the point of exporting one is that somebody reads it away from the app.
 *
 * Markdown comes through the same block parser the Word export uses, so the
 * two formats do not drift.
 */
import { downloadBlob } from '@/lib/exportTranscript'
import { parseMarkdownBlocks } from '@/lib/markdownBlocks'
import {
  QUADRANT_MEANING,
  profileFileStem,
  type ProfileExportPayload,
} from '@/lib/exportCharacterProfile'

/** A4 in points, the jsPDF default unit. */
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 48
const BODY_W = PAGE_W - MARGIN * 2

type Cursor = { y: number }

export async function exportProfilePdf(payload: ProfileExportPayload): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const cursor: Cursor = { y: MARGIN }

  /**
   * Advance the cursor, starting a page when the next block would not fit.
   *
   * Checked BEFORE writing rather than after: writing first and paginating
   * afterwards is what silently clips the last line of a page, and a clipped
   * derailer reads as a shorter list rather than a broken export.
   */
  const need = (height: number) => {
    if (cursor.y + height > PAGE_H - MARGIN) {
      doc.addPage()
      cursor.y = MARGIN
    }
  }

  const write = (
    text: string,
    opts: {
      size?: number
      style?: 'normal' | 'bold' | 'italic'
      gap?: number
      indent?: number
      colour?: [number, number, number]
    } = {},
  ) => {
    const size = opts.size ?? 10
    const indent = opts.indent ?? 0
    doc.setFont('helvetica', opts.style ?? 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(opts.colour ?? [17, 24, 39]))
    const lines = doc.splitTextToSize(text, BODY_W - indent) as string[]
    const lineHeight = size * 1.35
    for (const line of lines) {
      need(lineHeight)
      doc.text(line, MARGIN + indent, cursor.y + size)
      cursor.y += lineHeight
    }
    cursor.y += opts.gap ?? 0
  }

  const rule = () => {
    need(12)
    doc.setDrawColor(209, 213, 219)
    doc.line(MARGIN, cursor.y + 4, PAGE_W - MARGIN, cursor.y + 4)
    cursor.y += 12
  }

  // ── Cover block ────────────────────────────────────────────────────
  write(payload.name, { size: 22, style: 'bold', gap: 2 })
  write(
    payload.source ? `${payload.source} — PRISM character profile` : 'PRISM character profile',
    { size: 11, style: 'italic', colour: [75, 85, 99], gap: 10 },
  )

  // The synthetic notice is printed on page 1, in full, before anything that
  // could be mistaken for an assessment. A PDF travels further than the tab it
  // came from, and this is the only thing that follows it.
  doc.setFillColor(254, 243, 199)
  const noticeLines = doc.splitTextToSize(payload.notice, BODY_W - 16) as string[]
  const noticeH = noticeLines.length * 12 + 16
  need(noticeH)
  doc.rect(MARGIN, cursor.y, BODY_W, noticeH, 'F')
  cursor.y += 8
  write(payload.notice, { size: 9, style: 'bold', indent: 8, colour: [120, 53, 15], gap: 14 })

  if (payload.reading) {
    write('First reading', { size: 14, style: 'bold', gap: 4 })
    write(payload.reading, { gap: 12 })
  }

  // ── Brain map ──────────────────────────────────────────────────────
  if (payload.colours.length) {
    write(`Brain map (${payload.scoreType})`, { size: 14, style: 'bold', gap: 6 })
    for (const q of payload.colours) {
      need(30)
      // A bar, because four numbers in a column is not a map. Width is the
      // score as a fraction of 100 — the same scale the page renders.
      const barW = Math.max(2, (Math.min(100, q.value) / 100) * (BODY_W - 190))
      doc.setFillColor(...(QUADRANT_RGB[q.name] ?? [107, 114, 128]))
      doc.rect(MARGIN + 132, cursor.y + 2, barW, 9, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(17, 24, 39)
      doc.text(`${q.name} ${q.value}`, MARGIN, cursor.y + 10)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(75, 85, 99)
      doc.text(q.band, MARGIN + 132 + barW + 6, cursor.y + 10)
      cursor.y += 14
      // What the pairing measures, spelled out. The colour names mislead —
      // Gold reads as discipline, Green as patience — and this is the single
      // error the whole surface exists to prevent.
      write(QUADRANT_MEANING[q.name] ?? '', { size: 8, colour: [107, 114, 128], indent: 12, gap: 4 })
    }
    cursor.y += 8
  }

  // ── Analysis ───────────────────────────────────────────────────────
  if (payload.analysis) {
    rule()
    write('Analysis', { size: 14, style: 'bold', gap: 6 })
    for (const block of parseMarkdownBlocks(payload.analysis)) {
      if (block.kind === 'blank') {
        cursor.y += 4
      } else if (block.kind === 'heading') {
        cursor.y += 4
        write(block.text, { size: block.level <= 2 ? 12 : 11, style: 'bold', gap: 3 })
      } else if (block.kind === 'bullet') {
        write(`•  ${block.text}`, { indent: 10, gap: 2 })
      } else if (block.kind === 'ordered') {
        write(`${block.index}.  ${block.text}`, { indent: 10, gap: 2 })
      } else {
        write(block.text, { gap: 4 })
      }
    }
    cursor.y += 8
  }

  // ── Scores, one table per battery ──────────────────────────────────
  //
  // Each row carries the scale's DEFINITION next to its number. Eighty-eight
  // bare numbers are unreadable to anyone who does not already know the
  // instrument, and reading a scale from its name is precisely the failure this
  // surface was built to demonstrate.
  for (const group of payload.rubric?.groups ?? []) {
    const rows = group.dimensions.filter((d) => payload.scores[d.key])
    if (!rows.length) continue
    rule()
    write(group.group, { size: 13, style: 'bold', gap: 2 })
    write(group.definition, { size: 8, style: 'italic', colour: [107, 114, 128], gap: 6 })
    for (const d of rows) {
      const byType = payload.scores[d.key]
      const value = byType[payload.scoreType] ?? byType.Underlying
      need(24)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(17, 24, 39)
      doc.text(`${d.label}`, MARGIN, cursor.y + 9)
      doc.text(value === undefined ? '—' : String(value), PAGE_W - MARGIN - 30, cursor.y + 9)
      cursor.y += 13
      write(d.measures, { size: 8, colour: [75, 85, 99], indent: 10, gap: 1 })
      const why = payload.evidence[d.key]
      if (why) {
        write(`Why: ${why}`, { size: 8, style: 'italic', colour: [107, 114, 128], indent: 10, gap: 4 })
      } else {
        cursor.y += 3
      }
    }
  }

  // Page numbers last, once the total is known.
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(`${payload.name} — synthetic profile — ${p} of ${total}`, MARGIN, PAGE_H - 24)
  }

  downloadBlob(`${profileFileStem(payload.name)}.pdf`, doc.output('blob'))
}

/**
 * Bar colours for the brain map.
 *
 * Taken from the PRISM quadrant names directly, NOT from the app's
 * `--color-prism-*` tokens: at least one of those is mis-set (the Gold token
 * holds a red), and an export that inherits a UI bug ships it to whoever reads
 * the PDF. Four literals that can be checked against the canon beat a token
 * indirection that cannot.
 */
const QUADRANT_RGB: Record<string, [number, number, number]> = {
  Green: [34, 139, 87],
  Blue: [37, 99, 168],
  Red: [190, 45, 45],
  Gold: [198, 145, 30],
}
