/**
 * House-style distributor pages: read the server's answers as they really are.
 *
 * The classic distributor pages fall back to built-in sample figures whenever
 * the server sends nothing they recognise. These readers never invent a value:
 * a field that is missing or not a number reads as `null`, and the page shows
 * a dash ("—") for it. Shapes follow the dashboard service's distributor
 * responses (practitioners, credits, transactions, territory).
 */

export const DASH = "—"

export type HousePractitioner = {
  id: string
  name: string
  email: string | null
  region: string | null
  given: number | null
  used: number | null
}

export type HouseCredits = {
  available: number | null
  given: number | null
  used: number | null
}

export type HouseTransaction = {
  id: string
  type: string
  amount: number | null
  description: string | null
  createdAt: string | null
}

export type HouseTerritory = {
  id: string
  name: string
  practitioners: number | null
  coverage: number | null
}

type Obj = Record<string, unknown>

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null
}

function list(data: unknown, key: string): unknown[] | null {
  if (!isObj(data)) return null
  const v = data[key]
  return Array.isArray(v) ? v : null
}

/** `null` when the response has no practitioner list at all (not the same as an empty one). */
export function readPractitioners(data: unknown): HousePractitioner[] | null {
  const rows = list(data, "practitioners")
  if (!rows) return null
  return rows.filter(isObj).map((p, i) => ({
    id: str(p.id) ?? str(p.practitioner_id) ?? `row-${i}`,
    name: str(p.name) ?? str(p.email) ?? DASH,
    email: str(p.email),
    region: str(p.region),
    given: num(p.credits_allocated),
    used: num(p.credits_used),
  }))
}

export function readCredits(data: unknown): HouseCredits | null {
  if (!isObj(data)) return null
  return {
    available: num(data.balance),
    given: num(data.total_allocated),
    used: num(data.total_used),
  }
}

export function readTransactions(data: unknown): HouseTransaction[] | null {
  const rows = list(data, "transactions")
  if (!rows) return null
  return rows.filter(isObj).map((t, i) => ({
    id: str(t.id) ?? `tx-${i}`,
    type: str(t.type) ?? "",
    amount: num(t.amount),
    description: str(t.description),
    createdAt: str(t.created_at),
  }))
}

export function readTerritories(data: unknown): HouseTerritory[] | null {
  const rows = list(data, "territories")
  if (!rows) return null
  return rows.filter(isObj).map((t, i) => ({
    id: str(t.id) ?? `t-${i}`,
    name: str(t.name) ?? str(t.region_code) ?? DASH,
    practitioners: num(t.practitioner_count),
    coverage: num(t.coverage_pct),
  }))
}

const NUM_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })

/** "1,250" — or "—" when there is no real figure. */
export function formatCredits(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? NUM_FMT.format(n) : DASH
}

/** Used as a share of given, e.g. "84%"; "—" when nothing has been given. */
export function formatShare(used: number | null, given: number | null): string {
  if (used == null || given == null || given <= 0) return DASH
  return `${Math.round((used / given) * 100)}%`
}

/** Plain words for the ledger's transaction types. */
export function transactionLabel(type: string): string {
  switch (type.toLowerCase()) {
    case "purchase":
      return "Credits bought"
    case "allocate":
    case "allocation":
      return "Given to a practitioner"
    case "use":
      return "Used"
    case "refund":
      return "Refund"
    case "return":
      return "Returned"
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : "Credit activity"
  }
}

/** "Good morning" / "Good afternoon" / "Good evening" for the given hour (0–23). */
export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

/** The account's own first name, or null — never a stand-in name. */
export function firstNameOf(user: { fullName?: string | null; name?: string | null } | null | undefined): string | null {
  const full = (user?.fullName ?? user?.name ?? "").trim()
  if (!full) return null
  return full.split(/\s+/)[0] || null
}
