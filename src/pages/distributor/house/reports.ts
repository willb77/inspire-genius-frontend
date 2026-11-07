import type { HousePractitioner, HouseTransaction } from "./distributorData"

export type RegionRow = { region: string; practitioners: number; given: number; used: number }

/** Totals per region, worked out from the real roster. A practitioner with no region counts under "No region". */
export function byRegion(practitioners: HousePractitioner[]): RegionRow[] {
  const map = new Map<string, RegionRow>()
  for (const p of practitioners) {
    const region = p.region ?? "No region"
    const row = map.get(region) ?? { region, practitioners: 0, given: 0, used: 0 }
    row.practitioners += 1
    row.given += p.given ?? 0
    row.used += p.used ?? 0
    map.set(region, row)
  }
  return [...map.values()].sort((a, b) => b.used - a.used || a.region.localeCompare(b.region))
}

export type MonthRow = { key: string; label: string; bought: number; given: number; used: number }

const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" })

/** Ledger activity per calendar month (UTC), newest month first. Rows with no valid date are left out. */
export function byMonth(transactions: HouseTransaction[]): MonthRow[] {
  const map = new Map<string, MonthRow>()
  for (const t of transactions) {
    if (!t.createdAt || t.amount == null) continue
    const d = new Date(t.createdAt)
    if (isNaN(d.getTime())) continue
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const row = map.get(key) ?? { key, label: MONTH_FMT.format(d), bought: 0, given: 0, used: 0 }
    const amt = Math.abs(t.amount)
    const type = t.type.toLowerCase()
    if (type === "purchase") row.bought += amt
    else if (type === "allocate" || type === "allocation") row.given += amt
    else if (type === "use") row.used += amt
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key))
}
