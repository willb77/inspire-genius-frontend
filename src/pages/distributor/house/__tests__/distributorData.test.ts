import {
  DASH,
  firstNameOf,
  formatCredits,
  formatShare,
  greetingFor,
  readCredits,
  readPractitioners,
  readTerritories,
  readTransactions,
  transactionLabel,
} from "../distributorData"
import { byMonth, byRegion } from "../reports"

describe("distributor house readers never invent a value", () => {
  it("readCredits maps the server's fields and leaves missing ones null", () => {
    expect(readCredits({ balance: 120, total_allocated: 80, total_used: 30, currency: "USD" })).toEqual({
      available: 120,
      given: 80,
      used: 30,
    })
    expect(readCredits({ balance: "lots" })).toEqual({ available: null, given: null, used: null })
    expect(readCredits(undefined)).toBeNull()
    expect(readCredits([1, 2])).toBeNull()
  })

  it("readPractitioners distinguishes no list (null) from an empty list", () => {
    expect(readPractitioners(undefined)).toBeNull()
    expect(readPractitioners({ total: 0 })).toBeNull()
    expect(readPractitioners({ practitioners: [] })).toEqual([])
    const rows = readPractitioners({
      practitioners: [
        { id: "a", name: "Pat Doe", email: "test@example.com", region: null, credits_allocated: 10, credits_used: 4 },
        { practitioner_id: "b", email: "test@example.com" },
        "junk",
      ],
    })
    expect(rows).toEqual([
      { id: "a", name: "Pat Doe", email: "test@example.com", region: null, given: 10, used: 4 },
      { id: "b", name: "test@example.com", email: "test@example.com", region: null, given: null, used: null },
    ])
  })

  it("readPractitioners falls back to a row id and a dash name, never a made-up person", () => {
    expect(readPractitioners({ practitioners: [{}] })).toEqual([
      { id: "row-0", name: DASH, email: null, region: null, given: null, used: null },
    ])
  })

  it("readTransactions and readTerritories read the real shapes", () => {
    expect(
      readTransactions({
        transactions: [{ id: "t1", type: "purchase", amount: 50, description: null, created_at: "2026-11-03T10:00:00Z" }, {}],
      }),
    ).toEqual([
      { id: "t1", type: "purchase", amount: 50, description: null, createdAt: "2026-11-03T10:00:00Z" },
      { id: "tx-1", type: "", amount: null, description: null, createdAt: null },
    ])
    expect(readTransactions({})).toBeNull()
    expect(
      readTerritories({ territories: [{ id: "r1", name: "North", region_code: "N", practitioner_count: 3, coverage_pct: 40.4 }, { region_code: "S" }] }),
    ).toEqual([
      { id: "r1", name: "North", practitioners: 3, coverage: 40.4 },
      { id: "t-1", name: "S", practitioners: null, coverage: null },
    ])
    // The classic page reads `regions`, which the server never sends.
    expect(readTerritories({ regions: [{ name: "x" }] })).toBeNull()
    expect(readTerritories({ territories: [{}] })).toEqual([{ id: "t-0", name: DASH, practitioners: null, coverage: null }])
  })
})

describe("distributor house formatting", () => {
  it("formatCredits shows a dash for anything that is not a real number", () => {
    expect(formatCredits(1250)).toBe("1,250")
    expect(formatCredits(0)).toBe("0")
    expect(formatCredits(2.5)).toBe("2.5")
    expect(formatCredits(null)).toBe(DASH)
    expect(formatCredits(undefined)).toBe(DASH)
    expect(formatCredits(NaN)).toBe(DASH)
  })

  it("formatShare is a percentage of credits given, or a dash", () => {
    expect(formatShare(42, 50)).toBe("84%")
    expect(formatShare(0, 0)).toBe(DASH)
    expect(formatShare(null, 10)).toBe(DASH)
    expect(formatShare(5, null)).toBe(DASH)
  })

  it("transactionLabel uses plain words", () => {
    expect(transactionLabel("purchase")).toBe("Credits bought")
    expect(transactionLabel("allocate")).toBe("Given to a practitioner")
    expect(transactionLabel("Allocation")).toBe("Given to a practitioner")
    expect(transactionLabel("use")).toBe("Used")
    expect(transactionLabel("refund")).toBe("Refund")
    expect(transactionLabel("return")).toBe("Returned")
    expect(transactionLabel("bonus")).toBe("Bonus")
    expect(transactionLabel("")).toBe("Credit activity")
  })

  it("greetingFor follows the clock", () => {
    expect(greetingFor(8)).toBe("Good morning")
    expect(greetingFor(12)).toBe("Good afternoon")
    expect(greetingFor(17)).toBe("Good afternoon")
    expect(greetingFor(18)).toBe("Good evening")
  })

  it("firstNameOf uses the account's own name or nothing", () => {
    expect(firstNameOf({ fullName: "Carolina Reyes" })).toBe("Carolina")
    expect(firstNameOf({ fullName: null, name: "  Sam  Test " })).toBe("Sam")
    expect(firstNameOf({ fullName: "   " })).toBeNull()
    expect(firstNameOf(null)).toBeNull()
  })
})

describe("distributor house reports", () => {
  it("byRegion totals the real roster, busiest region first", () => {
    const rows = byRegion([
      { id: "1", name: "A", email: null, region: "North", given: 10, used: 5 },
      { id: "2", name: "B", email: null, region: "North", given: 4, used: 4 },
      { id: "3", name: "C", email: null, region: null, given: null, used: 20 },
      { id: "4", name: "D", email: null, region: "East", given: 1, used: null },
    ])
    expect(rows).toEqual([
      { region: "No region", practitioners: 1, given: 0, used: 20 },
      { region: "North", practitioners: 2, given: 14, used: 9 },
      { region: "East", practitioners: 1, given: 1, used: 0 },
    ])
  })

  it("byRegion breaks ties by name", () => {
    expect(
      byRegion([
        { id: "1", name: "A", email: null, region: "West", given: 0, used: 0 },
        { id: "2", name: "B", email: null, region: "East", given: 0, used: 0 },
      ]).map((r) => r.region),
    ).toEqual(["East", "West"])
  })

  it("byMonth groups the ledger by month, newest first, and skips undated rows", () => {
    const rows = byMonth([
      { id: "a", type: "purchase", amount: 100, description: null, createdAt: "2026-10-02T00:00:00Z" },
      { id: "b", type: "allocate", amount: -30, description: null, createdAt: "2026-10-20T00:00:00Z" },
      { id: "c", type: "use", amount: 5, description: null, createdAt: "2026-11-01T00:00:00Z" },
      { id: "d", type: "Allocation", amount: 2, description: null, createdAt: "2026-11-02T00:00:00Z" },
      { id: "e", type: "refund", amount: 9, description: null, createdAt: "2026-11-03T00:00:00Z" },
      { id: "f", type: "purchase", amount: 7, description: null, createdAt: null },
      { id: "g", type: "purchase", amount: 7, description: null, createdAt: "not a date" },
      { id: "h", type: "purchase", amount: null, description: null, createdAt: "2026-11-03T00:00:00Z" },
    ])
    expect(rows).toEqual([
      { key: "2026-11", label: "Nov 2026", bought: 0, given: 2, used: 5 },
      { key: "2026-10", label: "Oct 2026", bought: 100, given: 30, used: 0 },
    ])
  })
})
