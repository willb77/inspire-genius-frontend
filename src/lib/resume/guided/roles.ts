/**
 * RWO-8 — roles the person adds by hand in Step 2 ("Add a role"). Like the
 * interview answers they count as the person's own facts for the draft; they
 * live in page state and ride the draft request as `roles`. Shown only while
 * the server sends `rolesEnabled`.
 */
import type { AddedRole } from "@/types/resumeWriter"

export const ROLES_MAX = 5
export const ROLE_BULLETS_MAX = 3
export const ROLE_TEXT_MAX = 120
export const ROLE_DATE_MAX = 20
export const ROLE_BULLET_MAX = 300

export type RoleDraft = {
  title: string
  organization: string
  start: string
  end: string
  present: boolean
  bullets: string[]
}

export const EMPTY_ROLE: RoleDraft = { title: "", organization: "", start: "", end: "", present: false, bullets: ["", "", ""] }

/** A role ready to send, or null when it lacks a title or an organization.
 * Empty fields are left out, never sent as "". */
export function cleanRole(r: RoleDraft): AddedRole | null {
  const title = r.title.trim().slice(0, ROLE_TEXT_MAX)
  const organization = r.organization.trim().slice(0, ROLE_TEXT_MAX)
  if (!title || !organization) return null
  const start = r.start.trim().slice(0, ROLE_DATE_MAX)
  const end = r.present ? "Present" : r.end.trim().slice(0, ROLE_DATE_MAX)
  const bullets = r.bullets
    .map((b) => b.trim().slice(0, ROLE_BULLET_MAX))
    .filter(Boolean)
    .slice(0, ROLE_BULLETS_MAX)
  return {
    title,
    organization,
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
    ...(bullets.length ? { bullets } : {}),
  }
}

/** The roles for the request: cleaned, incomplete ones dropped, at most ROLES_MAX. */
export function rolesForRequest(roles: RoleDraft[]): AddedRole[] {
  return roles
    .map(cleanRole)
    .filter((r): r is AddedRole => r !== null)
    .slice(0, ROLES_MAX)
}

/** One line for the list: "Founder, Inspires Genius · 2019 – Present". */
export function roleLine(r: RoleDraft): string {
  const dates = [r.start.trim(), r.present ? "Present" : r.end.trim()].filter(Boolean).join(" – ")
  return `${r.title.trim()}, ${r.organization.trim()}${dates ? ` · ${dates}` : ""}`
}
