// GRANT vertical — minimal inline-emphasis renderer for translated strings (I18N-5A).
//
// A few sentences carry bold/code spans in the middle. Splitting such a sentence
// across several keys would hard-code English word order, so the translation keeps
// the whole sentence with simple <tag>…</tag> markers and this helper turns the
// markers back into elements. Only the tag names the caller passes are recognised
// (anything else, including a "<" inside an interpolated value, stays literal text),
// and tags do not nest.

import { cloneElement, type ReactElement, type ReactNode } from "react"

export function RichText({ text, tags }: { text: string; tags: Record<string, ReactElement> }) {
  const names = Object.keys(tags)
  if (names.length === 0) return <>{text}</>
  const re = new RegExp(`<(${names.join("|")})>([\\s\\S]*?)</\\1>`, "g")
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    nodes.push(cloneElement(tags[m[1]], { key: key++ }, m[2]))
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return <>{nodes}</>
}
