import type { OrgMemberUsage } from "@/types/super-admin/orgUsage"

/** Dollars. A real but sub-cent cost reads "< $0.01", never "$0.00". */
export function formatUsd(v: number | null | undefined): string {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n) || n === 0) return "$0.00"
  if (n > 0 && n < 0.01) return "< $0.01"
  return `$${n.toFixed(2)}`
}

export function formatCount(v: number | null | undefined): string {
  return Number(v ?? 0).toLocaleString()
}

/** Backend timestamps are naive UTC; treat a zone-less ISO string as UTC. */
export function parseUtc(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) || iso.length <= 10 ? iso : `${iso}Z`
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatWhen(iso: string | null | undefined, empty = "—"): string {
  const d = parseUtc(iso)
  if (!d) return empty
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export type MemberIdentity = { name: string; email: string; role: string }

/** Neutralise spreadsheet formula injection and quote a CSV cell. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function membersCsv(
  rows: OrgMemberUsage[],
  who: (userId: string) => MemberIdentity | undefined,
  windowDays: number,
): string {
  const header = [
    "Name", "Email", "Role", "Status", "Last AI use (UTC)", "Sessions",
    "AI responses", "Tokens", `Estimated AI cost USD (last ${windowDays} days)`,
  ]
  const lines = rows.map((r) => {
    const p = who(r.user_id)
    const status = r.is_active === null ? "" : r.is_active ? "Active" : "Inactive"
    return [
      p?.name ?? "", p?.email ?? "", p?.role ?? "", status, r.last_active_at ?? "",
      r.sessions, r.responses, r.total_tokens, r.estimated_cost_usd.toFixed(4),
    ].map(csvCell).join(",")
  })
  return [header.map(csvCell).join(","), ...lines].join("\r\n")
}
