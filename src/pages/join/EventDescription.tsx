import { Fragment, type ReactNode } from "react"

/**
 * The public description of an event, rendered from Markdown.
 *
 * Deliberately NOT a general Markdown library. It builds React elements for
 * exactly what the admin editor can produce — paragraphs, **bold**, *italic*,
 * bullet and numbered lists, and links — and shows everything else as escaped
 * text. There is no HTML path at all: raw HTML in the source (`<img onerror>`,
 * `<script>`) is just characters on the page. Links are limited to http(s) and
 * mailto. A description written before the editor existed is plain text, which
 * is valid Markdown here, and renders as it did (line breaks kept).
 */

const SAFE_HREF = /^(https?:\/\/|mailto:)/i
const BULLET = /^[-*+]\s+/
const NUMBERED = /^\d+[.)]\s+/

/** Inline: escapes, links, bold, italic — innermost-first by earliest match. */
const INLINE =
  /\\([\\`*_{}[\]()#+\-.!>|~])|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+?)\*\*|__([^_]+?)__|\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_/

function inline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  let n = 0
  while (rest.length > 0) {
    const m = INLINE.exec(rest)
    if (!m) {
      out.push(rest)
      break
    }
    if (m.index > 0) out.push(rest.slice(0, m.index))
    const k = `${key}-${n++}`
    if (m[1] !== undefined) out.push(m[1])
    else if (m[2] !== undefined) {
      out.push(
        SAFE_HREF.test(m[3]) ? (
          <a key={k} href={m[3]} target="_blank" rel="noopener noreferrer nofollow" className="underline">
            {inline(m[2], k)}
          </a>
        ) : (
          <Fragment key={k}>{inline(m[2], k)}</Fragment>
        ),
      )
    } else if (m[4] !== undefined || m[5] !== undefined) out.push(<strong key={k}>{inline((m[4] ?? m[5]) as string, k)}</strong>)
    else out.push(<em key={k}>{inline((m[6] ?? m[7]) as string, k)}</em>)
    rest = rest.slice(m.index + m[0].length)
  }
  return out
}

type Block = { kind: "p"; lines: string[] } | { kind: "ul" | "ol"; items: string[] }

function parse(markdown: string): Block[] {
  const blocks: Block[] = []
  for (const chunk of markdown.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((l) => l.trim() !== "")
    if (lines.length === 0) continue
    const kind = lines.every((l) => BULLET.test(l.trim())) ? "ul" : lines.every((l) => NUMBERED.test(l.trim())) ? "ol" : "p"
    if (kind === "p") {
      blocks.push({ kind, lines: lines.map((l) => l.trimEnd().replace(/\\$/, "")) })
      continue
    }
    const items = lines.map((l) => l.trim().replace(kind === "ul" ? BULLET : NUMBERED, ""))
    const prev = blocks[blocks.length - 1]
    // A loose list (blank line between items) arrives as several chunks: one list.
    if (prev && prev.kind === kind) prev.items.push(...items)
    else blocks.push({ kind, items })
  }
  return blocks
}

export function EventDescription({ markdown }: { markdown: string }) {
  const blocks = parse(markdown)
  return (
    <div className="mt-2 space-y-2 text-sm">
      {blocks.map((b, i) =>
        b.kind === "p" ? (
          <p key={i} className="whitespace-pre-line">
            {inline(b.lines.join("\n"), `b${i}`)}
          </p>
        ) : b.kind === "ul" ? (
          <ul key={i} className="list-disc pl-5">
            {b.items.map((t, j) => (
              <li key={j}>{inline(t, `b${i}-${j}`)}</li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="list-decimal pl-5">
            {b.items.map((t, j) => (
              <li key={j}>{inline(t, `b${i}-${j}`)}</li>
            ))}
          </ol>
        ),
      )}
    </div>
  )
}
