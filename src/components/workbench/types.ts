/**
 * The shared Workbench surface — manager and practitioner.
 *
 * These two roles do the same job: they hold a roster of people, meet them on a
 * schedule, and act on whoever needs attention. The wireframes differ only in
 * chrome (the manager gets an org-branded gradient hero, the practitioner a
 * cream editorial panel) and in vocabulary ("Team Roster" vs "Client Roster").
 * Everything below the hero is the same surface, so it is ONE component
 * configured per role rather than two that drift.
 *
 * The config is data, not JSX, on purpose: it keeps every role difference in a
 * single readable object at the call site, so "what does a practitioner see
 * that a manager doesn't?" is answered by reading one file rather than diffing
 * two page components.
 */
import type { ReactNode } from "react"

/** A headline number. `value: null` means NOT MEASURED — never render it as 0. */
export type WorkbenchStat = {
  key: string
  label: string
  /** `null` renders as an em dash with a tooltip, never as zero. A zero we did
   *  not measure is a claim we cannot support, and on a roster surface it reads
   *  as "this person has done nothing". */
  value: number | null
  hint: string
  /** `alert` renders the number in the warning colour. Reserved for counts that
   *  ask the viewer to DO something — overdue steps, people at risk. */
  tone?: "default" | "alert"
}

/** One person in a list. */
export type WorkbenchPerson = {
  id: string
  /** `null` when there is no name on file. Rendered as "Name not on file" —
   *  and sorted LAST, so the least identifiable person does not lead the list. */
  name: string | null
  meta: string
  /** Short status pill, e.g. "1 overdue" or "No prep". Omitted when there is
   *  nothing to say — an empty pill is visual noise that reads as a state. */
  badge?: string
  badgeTone?: "warn" | "muted"
  href: string
}

export type WorkbenchListPanel = {
  title: string
  /** Optional header action, e.g. "Open roster". */
  action?: { label: string; to: string }
  rows: WorkbenchPerson[]
  /** Shown when `rows` is empty AND the fetch succeeded. Must describe the
   *  empty state honestly — see the note on `error` below. */
  emptyMessage: string
}

export type WorkbenchConfig = {
  role: "manager" | "practitioner"
  /** Chrome only. `gradient` = manager (org-branded), `cream` = practitioner. */
  hero: "gradient" | "cream"
  greeting: string
  subtitle: ReactNode
  /** Manager only — the org context strip in the hero. */
  orgLine?: string
  actions?: Array<{ label: string; to: string; variant: "primary" | "secondary" }>
  stats: WorkbenchStat[]
  upcoming: WorkbenchListPanel
  attention: WorkbenchListPanel
  /** Loading, error and empty are THREE states and must never collapse into
   *  one. A failed fetch rendered as an empty roster tells a manager their
   *  people have done nothing, which is a fabricated and alarming claim. */
  isLoading: boolean
  error?: unknown
  onRetry?: () => void
}
