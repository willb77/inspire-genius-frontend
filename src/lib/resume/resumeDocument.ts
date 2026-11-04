// RWO-2 — the ATS-safe résumé, as one ordered document (2026-11-03).
//
// Word, PDF and Copy all render from `buildResumeDocument`, so the three cannot
// disagree about what the résumé says (CSA docs/analysis/2026-11-03-rwo-2-…).
// The guide's ATS rules decide the shape: one column, the contact block in the
// body, standard headings, plain lines rather than chips.
//
// What never reaches a document, by construction (Bill's D3 + Q3): the
// "Drafted from" line, the AI disclaimer, the "Target —" line, any platform
// branding, the lines the fabrication check removed, and interview talking points.
// None of them is read here.
//
// Used only while the server's `resume_writer_options` switch is on; switch off,
// the page keeps today's renderers unchanged.

import type { GeneratedResume } from "@/types/resumeWriter"

/** Typed by the person for this draft. Never sent to the server, never stored. */
export type ResumeContact = {
  name: string
  email: string
  phone: string
  location: string
  link: string
}

export type DocBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "lines"; items: string[] }
  | { kind: "entry"; title: string; subtitle: string; dates: string; bullets: string[] }

export type DocSection = { key: string; heading: string; blocks: DocBlock[] }

export type ResumeDocument = {
  name: string
  headline: string
  contactLine: string
  sections: DocSection[]
}

/** Today's order — the server's Reverse-Chronological sections. */
export const DEFAULT_SECTIONS = ["summary", "competencies", "experience", "education", "certifications"]

/** Standard headings an applicant tracking system recognises. */
export const HEADINGS: Record<string, string> = {
  summary: "Summary",
  competencies: "Skills",
  selected_achievements: "Selected Achievements",
  experience: "Experience",
  projects: "Projects",
  technical_skills: "Technical Skills",
  training: "Training",
  activities: "Activities and Leadership",
  education: "Education",
  certifications: "Certifications",
}

/** Advice for the person — on the page, never in a file. */
export const PAGE_ONLY_KEYS: ReadonlySet<string> = new Set(["talking_points"])

const clean = (s: unknown): string => String(s ?? "").trim()
const nonEmpty = (items: unknown): string[] =>
  Array.isArray(items) ? items.map(clean).filter(Boolean) : []

export function contactLine(c: ResumeContact): string {
  return [c.location, c.phone, c.email, c.link].map(clean).filter(Boolean).join(" | ")
}

function section(key: string, draft: GeneratedResume): DocSection | null {
  const heading = HEADINGS[key]
  if (!heading || PAGE_ONLY_KEYS.has(key)) return null
  let blocks: DocBlock[] = []
  switch (key) {
    case "summary": {
      const text = clean(draft.summary)
      blocks = text ? [{ kind: "paragraph", text }] : []
      break
    }
    case "competencies": {
      const items = nonEmpty(draft.competencies)
      blocks = items.length ? [{ kind: "paragraph", text: items.join(", ") }] : []
      break
    }
    case "experience":
      blocks = (draft.experience ?? [])
        .map((e) => ({
          kind: "entry" as const,
          title: clean(e.title),
          subtitle: clean(e.organization),
          dates: clean(e.dates),
          bullets: nonEmpty(e.bullets),
        }))
        .filter((e) => e.title || e.subtitle || e.bullets.length)
      break
    case "projects":
      blocks = (draft.projects ?? [])
        .map((p) => ({
          kind: "entry" as const,
          title: clean(p.name),
          subtitle: clean(p.stack),
          dates: "",
          bullets: [p.problem, p.role, p.outcome].map(clean).filter(Boolean),
        }))
        .filter((p) => p.title || p.bullets.length)
      break
    case "technical_skills": {
      const items = (draft.technical_skills ?? [])
        .map((g) => {
          const skills = nonEmpty(g.skills).join(", ")
          const category = clean(g.category)
          return skills ? (category ? `${category}: ${skills}` : skills) : ""
        })
        .filter(Boolean)
      blocks = items.length ? [{ kind: "lines", items }] : []
      break
    }
    default: {
      const items = nonEmpty((draft as Record<string, unknown>)[key])
      blocks = items.length ? [{ kind: "bullets", items }] : []
    }
  }
  return blocks.length ? { key, heading, blocks } : null
}

/**
 * The résumé in the format's section order. A section the format does not list
 * but the draft carries is appended rather than dropped — a draft never loses
 * content silently because of a layout list.
 */
export function buildResumeDocument(
  draft: GeneratedResume,
  contact: ResumeContact,
  sections: string[] = DEFAULT_SECTIONS,
): ResumeDocument {
  const order = [...new Set([...sections, ...Object.keys(HEADINGS)])]
  return {
    name: clean(contact.name),
    headline: clean(draft.headline),
    contactLine: contactLine(contact),
    sections: order.map((k) => section(k, draft)).filter((s): s is DocSection => s !== null),
  }
}

/** Plain text for Copy — the same document, no markup. */
export function documentToPlainText(doc: ResumeDocument): string {
  const out: string[] = doc.name ? [doc.name] : []
  if (doc.headline) out.push(doc.headline)
  if (doc.contactLine) out.push(doc.contactLine)
  for (const s of doc.sections) {
    out.push("", s.heading.toUpperCase())
    for (const b of s.blocks) {
      if (b.kind === "paragraph") out.push(b.text)
      else if (b.kind === "bullets") out.push(...b.items.map((i) => `• ${i}`))
      else if (b.kind === "lines") out.push(...b.items)
      else {
        out.push([b.title, b.subtitle].filter(Boolean).join(", "))
        if (b.dates) out.push(b.dates)
        out.push(...b.bullets.map((i) => `• ${i}`))
      }
    }
  }
  return out.join("\n")
}

function words(s: string): string[] {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

/** `FirstName-LastName-Resume-TargetRole` (guide §10); no target, no suffix. */
export function atsFileBase(name: string, target?: string | null, kind = "Resume"): string {
  const who = words(name).join("-") || "My"
  const aim = words(target ?? "").join("-")
  return [who, kind, aim].filter(Boolean).join("-")
}
