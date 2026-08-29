/**
 * Minimal flowing-text layout for jsPDF.
 *
 * Extracted from the Character Lab profile exporter when a second PDF export
 * (comparisons, scenarios, Q&A) needed the same pagination. Two copies of
 * "advance the cursor and start a page when it overflows" is two chances to get
 * pagination subtly different between documents that sit side by side in the
 * same folder.
 *
 * Deliberately small. It knows about a cursor, a page break and a text block —
 * not about PRISM, characters, or any document's structure.
 */

/** A4 in points, the jsPDF default unit. */
export const PAGE_W = 595.28
export const PAGE_H = 841.89
export const MARGIN = 48
export const BODY_W = PAGE_W - MARGIN * 2

export type WriteOpts = {
  size?: number
  style?: 'normal' | 'bold' | 'italic'
  /** Extra space after the block. */
  gap?: number
  indent?: number
  colour?: [number, number, number]
}

/** The subset of jsPDF this module touches. Keeps the tests honest and small. */
export type PdfLike = {
  setFont: (f: string, s?: string) => unknown
  setFontSize: (n: number) => unknown
  setTextColor: (r: number, g: number, b: number) => unknown
  setDrawColor: (r: number, g: number, b: number) => unknown
  setFillColor: (r: number, g: number, b: number) => unknown
  rect: (x: number, y: number, w: number, h: number, style?: string) => unknown
  line: (x1: number, y1: number, x2: number, y2: number) => unknown
  addPage: () => unknown
  setPage: (n: number) => unknown
  getNumberOfPages: () => number
  splitTextToSize: (t: string, w: number) => string[]
  text: (t: string, x: number, y: number) => unknown
}

export type PdfWriter = {
  doc: PdfLike
  /** Current vertical position, in points from the top of the page. */
  y: () => number
  /** Move the cursor without writing (for hand-drawn blocks). */
  advance: (dy: number) => void
  /** Start a new page if `height` would not fit below the cursor. */
  need: (height: number) => void
  /** Write wrapped text, paginating as it goes. */
  write: (text: string, opts?: WriteOpts) => void
  /** A horizontal rule with the spacing this layout expects around it. */
  rule: () => void
  /** Stamp a footer on every page. Call last, once the total is known. */
  footer: (label: string) => void
}

export function createPdfWriter(doc: PdfLike): PdfWriter {
  let cursor = MARGIN

  /**
   * Checked BEFORE writing, never after. Writing first and paginating
   * afterwards is what silently clips the last line of a page — and a clipped
   * list reads as a shorter list, not as a broken export.
   */
  const need = (height: number) => {
    if (cursor + height > PAGE_H - MARGIN) {
      doc.addPage()
      cursor = MARGIN
    }
  }

  const write = (text: string, opts: WriteOpts = {}) => {
    const size = opts.size ?? 10
    const indent = opts.indent ?? 0
    doc.setFont('helvetica', opts.style ?? 'normal')
    doc.setFontSize(size)
    const [r, g, b] = opts.colour ?? [17, 24, 39]
    doc.setTextColor(r, g, b)
    const lines = doc.splitTextToSize(text, BODY_W - indent)
    const lineHeight = size * 1.35
    for (const line of lines) {
      need(lineHeight)
      doc.text(line, MARGIN + indent, cursor + size)
      cursor += lineHeight
    }
    cursor += opts.gap ?? 0
  }

  const rule = () => {
    need(12)
    doc.setDrawColor(209, 213, 219)
    doc.line(MARGIN, cursor + 4, PAGE_W - MARGIN, cursor + 4)
    cursor += 12
  }

  const footer = (label: string) => {
    const total = doc.getNumberOfPages()
    for (let p = 1; p <= total; p += 1) {
      doc.setPage(p)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175)
      doc.text(`${label} — ${p} of ${total}`, MARGIN, PAGE_H - 24)
    }
  }

  return {
    doc,
    y: () => cursor,
    advance: (dy: number) => {
      cursor += dy
    },
    need,
    write,
    rule,
    footer,
  }
}

/**
 * The synthetic-data notice, boxed, in full.
 *
 * Every Character Lab export gets this on page one. A PDF travels further than
 * the tab it came from, and this is the only thing that follows it — so it is
 * printed rather than referenced, and before anything that could be mistaken
 * for a real assessment.
 */
export function writeNotice(w: PdfWriter, notice: string): void {
  if (!notice) return
  w.doc.setFillColor(254, 243, 199)
  const lines = w.doc.splitTextToSize(notice, BODY_W - 16)
  const height = lines.length * 12 + 16
  w.need(height)
  w.doc.rect(MARGIN, w.y(), BODY_W, height, 'F')
  w.advance(8)
  w.write(notice, { size: 9, style: 'bold', indent: 8, colour: [120, 53, 15], gap: 14 })
}
