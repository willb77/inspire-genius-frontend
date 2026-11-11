import type { ExerciseSession, RoleFactCells } from "@/types/career-exercise/student"
import type { CounselorNote, ExerciseStage } from "@/types/career-exercise/counselor"
import { cellLine } from "./factCells"

/**
 * CX-5 — the worksheet's sections, in the exercise's order, and the PDF of it.
 * Pure: no React, no requests. The page and the PDF read the same session and
 * the same cells, so the PDF cannot say something the page does not.
 */

export type WorksheetSection = {
  id: string
  /** The stage whose output fills this section. */
  stage: ExerciseStage
  title: string
}

export const WORKSHEET_SECTIONS: WorksheetSection[] = [
  { id: "self-portrait", stage: "discover", title: "My self-portrait" },
  { id: "pillars", stage: "pillars", title: "My four pillars" },
  { id: "explorer", stage: "explore", title: "Career explorer" },
  { id: "buckets", stage: "narrow", title: "Sorting the roles" },
  { id: "experiments", stage: "test", title: "Three real-world experiments" },
  { id: "paths", stage: "commit", title: "Primary and Backup Paths" },
]

export const STAGE_LABELS: Record<ExerciseStage, string> = {
  welcome: "Getting started",
  discover: "Self-portrait",
  pillars: "Four pillars",
  explore: "Career explorer",
  narrow: "Sorting the roles",
  test: "Experiments",
  commit: "Paths",
  close: "Wrap-up",
}

export const STATUS_LABELS: Record<ExerciseSession["status"], string> = {
  active: "In progress",
  paused: "Paused",
  closed: "Finished",
}

/** The four pillars the exercise fills (CX-2's PILLARS output keys). */
export const PILLAR_LABELS: Record<string, string> = {
  wiring: "How I'm wired",
  interests: "Interests",
  aptitudes: "Aptitudes",
  context: "My situation",
}

export const BUCKETS = [
  { key: "curious", label: "Curious" },
  { key: "maybe", label: "Maybe" },
  { key: "not_for_me", label: "Not for me" },
] as const

export const REACTION_LABELS: Record<string, string> = {
  look_forward: "Looks forward to",
  dread: "Would dread",
}

export function pillarLabel(key: string): string {
  return PILLAR_LABELS[key] ?? key.replace(/_/g, " ")
}

export function roleTitle(session: ExerciseSession, code: string): string {
  return session.roles.find((r) => r.onet_soc === code)?.title ?? code
}

export function notesFor(session: ExerciseSession, stage: ExerciseStage): CounselorNote[] {
  return (session.annotations ?? []).filter(
    (a): a is CounselorNote => a.kind === "note" && a.stage === stage,
  )
}

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const NOTHING_YET = "Nothing here yet."

function list(items: string[]): string {
  const kept = items.map((s) => s.trim()).filter(Boolean)
  return kept.length ? `<ul>${kept.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : `<p class="muted">${NOTHING_YET}</p>`
}

function notesHtml(session: ExerciseSession, stage: ExerciseStage): string {
  const notes = notesFor(session, stage)
  if (!notes.length) return ""
  return notes.map((n) => `<p class="note"><strong>Counselor note:</strong> ${esc(n.text)}</p>`).join("")
}

function sectionBody(
  session: ExerciseSession,
  section: WorksheetSection,
  cells: Record<string, RoleFactCells>,
): string {
  switch (section.stage) {
    case "discover":
      return (
        (session.self_portrait ? `<blockquote>${esc(session.self_portrait)}</blockquote>` : "") +
        list(session.profile_reactions)
      )
    case "pillars": {
      const entries = Object.entries(session.pillars)
      if (!entries.length) return `<p class="muted">${NOTHING_YET}</p>`
      return entries.map(([k, v]) => `<h3>${esc(pillarLabel(k))}</h3>${list(v)}`).join("")
    }
    case "explore": {
      if (!session.roles.length) return `<p class="muted">${NOTHING_YET}</p>`
      const rows = session.roles
        .map((r) => {
          const c = cells[r.onet_soc]
          return `<tr><td>${esc(r.title)}</td><td>${esc(r.cluster)}</td><td>${esc(
            c ? cellLine(c.education) : "",
          )}</td><td>${esc(c ? cellLine(c.pay) : "")}</td></tr>`
        })
        .join("")
      const reactions = Object.entries(session.posting_reaction)
        .map(([k, v]) => `<p><strong>${esc(REACTION_LABELS[k] ?? k)}:</strong> ${esc(v.join(", "))}</p>`)
        .join("")
      return `<table><thead><tr><th>Role</th><th>Cluster</th><th>Typical education</th><th>Pay</th></tr></thead><tbody>${rows}</tbody></table>${reactions}`
    }
    case "narrow": {
      const sorted = session.roles.filter((r) => r.bucket)
      if (!sorted.length) return `<p class="muted">${NOTHING_YET}</p>`
      return BUCKETS.map(({ key, label }) => {
        const inBucket = sorted.filter((r) => r.bucket === key)
        return `<h3>${label}</h3>${list(inBucket.map((r) => (r.reason ? `${r.title} — ${r.reason}` : r.title)))}`
      }).join("")
    }
    case "test":
      return list(
        session.experiments.map(
          (e) => `${e.kind} — ${roleTitle(session, e.onet_soc)}${e.target_date ? ` (by ${e.target_date})` : ""}`,
        ),
      )
    case "commit": {
      const p = session.paths
      if (!p) return `<p class="muted">${NOTHING_YET}</p>`
      const lines = [`Primary: ${p.primary}`, `Backup: ${p.backup}`]
      if (p.check_in_adult) lines.push(`Check-in adult: ${p.check_in_adult}`)
      if (p.follow_up) lines.push(`Follow up by: ${p.follow_up}`)
      const conf = session.paths_confirmation
      if (conf?.at && conf.current) lines.push("Confirmed by your counselor.")
      return list(lines)
    }
    default:
      return ""
  }
}

/** A filesystem-safe name for the worksheet PDF. */
export function worksheetFileBase(session: ExerciseSession): string {
  const day = (session.updated_at || "").slice(0, 10).replace(/[^0-9-]/g, "")
  return `career-exploration-worksheet${day ? `_${day}` : ""}`
}

export function buildWorksheetHtml(session: ExerciseSession, cells: Record<string, RoleFactCells>): string {
  const sections = WORKSHEET_SECTIONS.map(
    (s) => `<h2>${esc(s.title)}</h2>${sectionBody(session, s, cells)}${notesHtml(session, s.stage)}`,
  ).join("")
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:32px;line-height:1.5}
    h1{color:#0f766e;font-size:22px;margin:0 0 4px}
    h2{color:#0D9488;font-size:15px;margin:20px 0 8px}
    h3{font-size:13px;margin:10px 0 4px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#0D9488;color:#fff}
    blockquote{border-left:3px solid #0D9488;margin:0 0 8px;padding-left:10px;font-style:italic}
    .muted{color:#6b7280}
    .note{background:#f0fdfa;padding:6px 8px;font-size:12px}
    .foot{margin-top:24px;color:#6b7280;font-size:11px}
  </style></head><body>
    <h1>Career exploration worksheet</h1>
    <p class="muted">${esc(STATUS_LABELS[session.status])} · step: ${esc(STAGE_LABELS[session.stage])}</p>
    ${sections}
    <p class="foot">Every option here is a hypothesis to test, not a verdict on what you can do. Pay and education
    come from published occupation data, with the area and data year beside each figure; where a figure is not
    available it is not estimated.</p>
  </body></html>`
}
