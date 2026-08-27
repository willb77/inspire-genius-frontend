import { mapWithConcurrency } from "@/lib/mapWithConcurrency"

describe("mapWithConcurrency", () => {
  it("never exceeds the limit in flight", async () => {
    let inFlight = 0
    let peak = 0
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 3, async (n) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight--
      return n
    })
    expect(peak).toBeLessThanOrEqual(3)
    expect(peak).toBeGreaterThan(1) // it does run concurrently, not serially
  })

  it("preserves input order regardless of completion order", async () => {
    const out = await mapWithConcurrency([30, 5, 20, 1], 4, async (ms) => {
      await new Promise((r) => setTimeout(r, ms))
      return ms
    })
    expect(out.map((o) => (o.status === "fulfilled" ? o.value : null))).toEqual([30, 5, 20, 1])
  })

  it("captures a rejection without cancelling the rest", async () => {
    // One failed analysis section must not lose the other six.
    const out = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom")
      return n
    })
    expect(out.map((o) => o.status)).toEqual(["fulfilled", "rejected", "fulfilled"])
    expect(out[1].status === "rejected" && (out[1].reason as Error).message).toBe("boom")
  })

  it("handles an empty list and a limit larger than the list", async () => {
    expect(await mapWithConcurrency([], 5, async () => 1)).toEqual([])
    const out = await mapWithConcurrency([1], 99, async (n) => n)
    expect(out).toEqual([{ status: "fulfilled", value: 1 }])
  })

  it("treats a limit below 1 as serial rather than deadlocking", async () => {
    const out = await mapWithConcurrency([1, 2], 0, async (n) => n)
    expect(out.map((o) => (o.status === "fulfilled" ? o.value : null))).toEqual([1, 2])
  })
})
