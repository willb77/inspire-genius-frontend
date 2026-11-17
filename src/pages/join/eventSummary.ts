/**
 * A short plain-text teaser for an event tile, taken from the admin's Markdown
 * description: the first paragraph, formatting marks removed, cut at a word
 * boundary. There is no separate "brief description" field on the server, so the
 * tile derives one; the full text is always one click away ("More Info").
 *
 * Plain text out, never HTML: React renders it as a text node.
 */
export const BRIEF_MAX = 160

export function briefDescription(markdown: string | null | undefined, max = BRIEF_MAX): string {
  const first = (markdown ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .find((c) => c !== "")
  if (!first) return ""
  const plain = first
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "") // list markers
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1") // links keep their text
    .replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, "$1") // escapes
    .replace(/(\*\*|__)(.+?)\1/g, "$2") // bold
    .replace(/(\*|_)([^*_\s][^*_]*?)\1/g, "$2") // italic
    .replace(/\s+/g, " ")
    .trim()
  if (plain.length <= max) return plain
  const cut = plain.slice(0, max)
  const space = cut.lastIndexOf(" ")
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`
}
