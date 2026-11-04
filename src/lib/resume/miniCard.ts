// RWO-2 — Option 11, the Mini Résumé / Profile Card, built from a finished draft.
//
// No model call and no daily slot: everything on the card is already in the
// draft the checks passed. For career fairs, networking and partner days; never
// for a formal application (guide, Option 11).

import type { GeneratedResume } from "@/types/resumeWriter"
import type { ResumeContact, ResumeDocument } from "./resumeDocument"
import { contactLine } from "./resumeDocument"

export type MiniCard = {
  name: string
  headline: string
  contactLine: string
  highlights: string[]
  skills: string[]
  bio: string
}

const clean = (s: unknown) => String(s ?? "").trim()

/** At most three sentences of the summary. */
export function shortBio(summary: string): string {
  const sentences = clean(summary).match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? []
  return sentences.slice(0, 3).map((s) => s.trim()).join(" ")
}

export function buildMiniCard(draft: GeneratedResume, contact: ResumeContact): MiniCard {
  const highlights = [
    ...(draft.selected_achievements ?? []),
    ...(draft.experience ?? []).map((e) => e.bullets?.[0] ?? ""),
  ]
    .map(clean)
    .filter(Boolean)
  const skills = [
    ...(draft.technical_skills ?? []).flatMap((g) => g.skills ?? []),
    ...(draft.competencies ?? []),
  ]
    .map(clean)
    .filter(Boolean)
  return {
    name: clean(contact.name),
    headline: clean(draft.headline),
    contactLine: contactLine(contact),
    highlights: [...new Set(highlights)].slice(0, 3),
    skills: [...new Set(skills)].slice(0, 6),
    bio: shortBio(draft.summary ?? ""),
  }
}

export function miniCardText(card: MiniCard): string {
  const out = [card.name, card.headline, card.contactLine].filter(Boolean)
  if (card.highlights.length) out.push("", "HIGHLIGHTS", ...card.highlights.map((h) => `• ${h}`))
  if (card.skills.length) out.push("", "KEY SKILLS", card.skills.join(", "))
  if (card.bio) out.push("", "BIO", card.bio)
  return out.join("\n")
}

/** The card in the résumé document shape, so it prints through the same text-PDF writer. */
export function miniCardDocument(card: MiniCard): ResumeDocument {
  const sections: ResumeDocument["sections"] = []
  if (card.highlights.length)
    sections.push({ key: "highlights", heading: "Highlights", blocks: [{ kind: "bullets", items: card.highlights }] })
  if (card.skills.length)
    sections.push({ key: "skills", heading: "Key Skills", blocks: [{ kind: "paragraph", text: card.skills.join(", ") }] })
  if (card.bio) sections.push({ key: "bio", heading: "Bio", blocks: [{ kind: "paragraph", text: card.bio }] })
  return { name: card.name, headline: card.headline, contactLine: card.contactLine, sections }
}
