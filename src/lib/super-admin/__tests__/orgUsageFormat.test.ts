import { csvCell, formatUsd, membersCsv, parseUtc } from "../orgUsageFormat"
import type { OrgMemberUsage } from "@/types/super-admin/orgUsage"

describe("formatUsd", () => {
  it("never shows a real sub-cent cost as $0.00", () => {
    expect(formatUsd(0.0042)).toBe("< $0.01")
    expect(formatUsd(0)).toBe("$0.00")
    expect(formatUsd(null)).toBe("$0.00")
    expect(formatUsd(12.345)).toBe("$12.35")
  })
})

describe("parseUtc", () => {
  it("reads a zone-less backend timestamp as UTC", () => {
    expect(parseUtc("2026-11-01T09:00:00")?.toISOString()).toBe("2026-11-01T09:00:00.000Z")
    expect(parseUtc("2026-11-01T09:00:00+00:00")?.toISOString()).toBe("2026-11-01T09:00:00.000Z")
    expect(parseUtc(null)).toBeNull()
    expect(parseUtc("nonsense")).toBeNull()
  })
})

describe("csvCell", () => {
  it("neutralises spreadsheet formulas and quotes", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`)
    expect(csvCell("@x")).toBe(`"'@x"`)
    expect(csvCell('a "b"')).toBe(`"a ""b"""`)
    expect(csvCell(null)).toBe(`""`)
  })
})

describe("membersCsv", () => {
  const rows: OrgMemberUsage[] = [
    { user_id: "u1", is_active: true, sessions: 2, responses: 5, total_tokens: 100, estimated_cost_usd: 0.1234, last_active_at: "2026-11-01T09:00:00" },
    { user_id: "u2", is_active: null, sessions: 0, responses: 0, total_tokens: 0, estimated_cost_usd: 0, last_active_at: null },
  ]
  it("writes one line per member, idle members included, with the window in the header", () => {
    const csv = membersCsv(rows, (id) => (id === "u1" ? { name: "Ann", email: "ann@example.com", role: "user" } : undefined), 30)
    const lines = csv.split("\r\n")
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain("Estimated AI cost USD (last 30 days)")
    expect(lines[1]).toBe(`"Ann","ann@example.com","user","Active","2026-11-01T09:00:00","2","5","100","0.1234"`)
    expect(lines[2]).toBe(`"","","","","","0","0","0","0.0000"`)
  })
})
