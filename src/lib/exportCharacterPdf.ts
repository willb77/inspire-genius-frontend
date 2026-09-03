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
  BODY_W,
  MARGIN,
  PAGE_W,
  createPdfWriter,
  writeNotice,
  type PdfLike,
} from '@/lib/pdfWriter'
import {
  QUADRANT_MEANING,
  payloadFileStem,
  payloadFooter,
  type ProfileExportPayload,
} from '@/lib/exportCharacterProfile'

export async function exportProfilePdf(payload: ProfileExportPayload): Promise<void> {
  const { jsPDF } = await import('jspdf')
  // Layout, pagination and the notice box come from the shared writer, so this
  // export and the narrative exports cannot paginate differently.
  const w = createPdfWriter(new jsPDF({ unit: 'pt', format: 'a4' }) as unknown as PdfLike)
  const doc = w.doc
  const { need, write } = w
  const rule = w.rule

  // ── Cover block ────────────────────────────────────────────────────
  write(payload.name, { size: 22, style: 'bold', gap: 2 })
  write(
    payload.source ? `${payload.source} — PRISM character profile` : 'PRISM character profile',
    { size: 11, style: 'italic', colour: [75, 85, 99], gap: 10 },
  )

  // Printed in full on page one — see writeNotice.
  writeNotice(w, payload.notice)

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
      doc.rect(MARGIN + 132, w.y() + 2, barW, 9, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(17, 24, 39)
      doc.text(`${q.name} ${q.value}`, MARGIN, w.y() + 10)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(75, 85, 99)
      doc.text(q.band, MARGIN + 132 + barW + 6, w.y() + 10)
      w.advance(14)
      // What the pairing measures, spelled out. The colour names mislead —
      // Gold reads as discipline, Green as patience — and this is the single
      // error the whole surface exists to prevent.
      write(QUADRANT_MEANING[q.name] ?? '', { size: 8, colour: [107, 114, 128], indent: 12, gap: 4 })
    }
    w.advance(8)
  }

  // ── Analysis ───────────────────────────────────────────────────────
  if (payload.analysis) {
    rule()
    write('Analysis', { size: 14, style: 'bold', gap: 6 })
    for (const block of parseMarkdownBlocks(payload.analysis)) {
      if (block.kind === 'blank') {
        w.advance(4)
      } else if (block.kind === 'heading') {
        w.advance(4)
        write(block.text, { size: block.level <= 2 ? 12 : 11, style: 'bold', gap: 3 })
      } else if (block.kind === 'bullet') {
        write(`•  ${block.text}`, { indent: 10, gap: 2 })
      } else if (block.kind === 'ordered') {
        write(`${block.index}.  ${block.text}`, { indent: 10, gap: 2 })
      } else {
        write(block.text, { gap: 4 })
      }
    }
    w.advance(8)
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
      doc.text(`${d.label}`, MARGIN, w.y() + 9)
      doc.text(value === undefined ? '—' : String(value), PAGE_W - MARGIN - 30, w.y() + 9)
      w.advance(13)
      write(d.measures, { size: 8, colour: [75, 85, 99], indent: 10, gap: 1 })
      const why = payload.evidence[d.key]
      if (why) {
        write(`Why: ${why}`, { size: 8, style: 'italic', colour: [107, 114, 128], indent: 10, gap: 4 })
      } else {
        w.advance(3)
      }
    }
  }

  // Page numbers last, once the total is known. The label is the caller's:
  // "synthetic profile" is a false statement about a real colleague, and the
  // footer is on every page of a document that outlives the tab it came from.
  w.footer(payloadFooter(payload))

  downloadBlob(`${payloadFileStem(payload)}.pdf`, (doc as unknown as { output: (t: string) => Blob }).output('blob'))
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
