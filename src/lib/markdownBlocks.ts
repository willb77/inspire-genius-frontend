/**
 * A deliberately small block parser for generated markdown.
 *
 * The Character Lab's write-ups, comparisons and scenarios come back as
 * markdown, and three surfaces have to render them: the page (react-markdown),
 * the Word export and the PDF export. The two exports cannot use
 * react-markdown — they emit document primitives, not DOM — so without a shared
 * parser they would each grow their own, and the Word one already had.
 *
 * This handles exactly what the model is asked to produce: ATX headings,
 * dash/star bullets, `1.` ordered items, and paragraphs. It is not a markdown
 * implementation and should not become one — anything richer belongs in
 * react-markdown on the page, and the exports should stay boring.
 */

export type MarkdownBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'ordered'; text: string; index: number }
  | { kind: 'para'; text: string }
  | { kind: 'blank' }

/**
 * Strip the inline marks the exports cannot render as formatting.
 *
 * Emphasis is dropped rather than approximated with asterisks: `**Green 71.5**`
 * printed literally into a PDF reads as a typo, and a reader who does not know
 * markdown has no way to tell it was meant to be bold.
 */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*>\s?/, '')
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  for (const raw of (markdown || '').split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      blocks.push({ kind: 'blank' })
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: heading[1].length,
        text: stripInlineMarkdown(heading[2]),
      })
      continue
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      blocks.push({ kind: 'bullet', text: stripInlineMarkdown(bullet[1]) })
      continue
    }
    const ordered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      blocks.push({
        kind: 'ordered',
        index: Number(ordered[1]),
        text: stripInlineMarkdown(ordered[2]),
      })
      continue
    }
    blocks.push({ kind: 'para', text: stripInlineMarkdown(line) })
  }
  return blocks
}
