/**
 * Client-side memoir assembly — the graceful fallback for Bio Capture.
 *
 * `POST /v1/agents/bio/{id}/memoir` MAY be absent (HTTP 404) in environments
 * where the backend has not been promoted yet. When it is, the Export action
 * must still produce something real: this builds a memoir from the narrative
 * JSON the page already holds, in the SAME shape the server returns
 * (`MemoirResponse`), so the export path downstream doesn't care which source
 * it came from.
 *
 * Episodes are grouped by module in the fixed `BIO_MODULE_TYPES` order and,
 * within a module, ordered by `ageAt` (nulls last) so a life reads roughly
 * chronologically. The markdown is the subset the export renderer
 * (`markdownToHtml`) understands: headings, bold, paragraphs and blockquotes.
 */
import {
  BIO_MODULE_LABELS,
  BIO_MODULE_TYPES,
  type BioEpisode,
  type MemberNarrative,
  type MemoirResponse,
  type MemoirStyle,
} from "@/types/bio"

/** A readable label for a module type, falling back to a titleised key. */
export function moduleLabel(moduleType: string): string {
  return (
    BIO_MODULE_LABELS[moduleType] ??
    moduleType
      .split("_")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ")
  )
}

/**
 * Order a module's episodes for reading: youngest `ageAt` first, unknown ages
 * last (they still belong, they just can't be placed on the timeline).
 */
export function orderEpisodes(episodes: BioEpisode[]): BioEpisode[] {
  return [...episodes].sort((a, b) => {
    if (a.ageAt == null && b.ageAt == null) return 0
    if (a.ageAt == null) return 1
    if (b.ageAt == null) return -1
    return a.ageAt - b.ageAt
  })
}

/**
 * Group episodes by module in the canonical order. Modules with no episodes are
 * omitted, so the memoir has no empty sections.
 */
export function groupEpisodesByModule(
  episodes: BioEpisode[],
): { moduleType: string; episodes: BioEpisode[] }[] {
  const byModule = new Map<string, BioEpisode[]>()
  for (const ep of episodes) {
    const list = byModule.get(ep.moduleType) ?? []
    list.push(ep)
    byModule.set(ep.moduleType, list)
  }
  // Canonical modules first, then any unrecognised module types the backend
  // sent, so nothing is silently dropped.
  const seen = new Set<string>(BIO_MODULE_TYPES)
  const extraModules = [...byModule.keys()].filter((m) => !seen.has(m))
  const order = [...BIO_MODULE_TYPES, ...extraModules]

  const out: { moduleType: string; episodes: BioEpisode[] }[] = []
  for (const moduleType of order) {
    const list = byModule.get(moduleType)
    if (!list || list.length === 0) continue
    out.push({ moduleType, episodes: orderEpisodes(list) })
  }
  return out
}

function renderEpisode(ep: BioEpisode, style: MemoirStyle): string {
  const era = ep.era?.trim()
  const heading = ep.title?.trim() || "Untitled"
  const eraSuffix = era ? ` — ${era}` : ""
  const lines: string[] = [`### ${heading}${eraSuffix}`, ""]

  if (ep.facts?.trim()) {
    lines.push(ep.facts.trim(), "")
  }

  const feelings: string[] = []
  if (ep.feelingThen?.trim()) feelings.push(`**Then:** ${ep.feelingThen.trim()}`)
  if (ep.feelingNow?.trim()) feelings.push(`**Now:** ${ep.feelingNow.trim()}`)
  if (feelings.length) {
    lines.push(feelings.join("  \n"), "")
  }

  if (style === "structured") {
    if (ep.impactSelf?.trim()) {
      lines.push(`**Impact on me:** ${ep.impactSelf.trim()}`, "")
    }
    if (ep.impactOthers?.trim()) {
      lines.push(`**Impact on others:** ${ep.impactOthers.trim()}`, "")
    }
  }

  if (ep.meaning?.trim()) {
    lines.push(`**What it means:** ${ep.meaning.trim()}`, "")
  }

  for (const quote of ep.quotes ?? []) {
    const q = quote?.trim()
    if (q) lines.push(`> ${q}`, "")
  }

  return lines.join("\n").trimEnd()
}

/**
 * Assemble a memoir from a narrative, returning the same `MemoirResponse` shape
 * the server would — with `generated: false` to mark it as client-built.
 */
export function buildClientMemoir(
  narrative: MemberNarrative,
  opts: { style?: MemoirStyle; moduleTypes?: string[] } = {},
): MemoirResponse {
  const style: MemoirStyle = opts.style ?? "structured"
  const filter = opts.moduleTypes && opts.moduleTypes.length
    ? new Set(opts.moduleTypes)
    : null

  const episodes = filter
    ? narrative.episodes.filter((e) => filter.has(e.moduleType))
    : narrative.episodes

  const grouped = groupEpisodesByModule(episodes)
  const title = "A Life in Chapters"

  const sections: string[] = [`# ${title}`, ""]
  for (const group of grouped) {
    sections.push(`## ${moduleLabel(group.moduleType)}`, "")
    for (const ep of group.episodes) {
      sections.push(renderEpisode(ep, style), "")
    }
  }

  if (grouped.length === 0) {
    sections.push(
      "_This memoir is still empty — talk to Chronicle to begin capturing your story._",
      "",
    )
  }

  return {
    memberId: narrative.memberId,
    title,
    markdown: sections.join("\n").trimEnd() + "\n",
    moduleCount: grouped.length,
    episodeCount: episodes.length,
    style,
    generated: false,
  }
}
