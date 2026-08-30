import { normalizeSectionScores } from "../live.service"

describe("normalizeSectionScores — tolerant of the backend's object shape", () => {
  it("handles the real backend OBJECT shape { section: { mean, weight, weighted } }", () => {
    // This is exactly what crashed the findings screen: .map() on an object.
    const raw = {
      vision: { mean: 3.3333, weight: 1.0, weighted: 3.3333 },
      behavioral: { mean: 4.0, weight: 1.0, weighted: 4.0 },
    }
    const out = normalizeSectionScores(raw)
    expect(out).toHaveLength(2)
    expect(out.find((s) => s.section === "vision")?.score).toBeCloseTo(3.3333)
    expect(out.find((s) => s.section === "behavioral")?.score).toBe(4.0)
  })

  it("handles a plain ARRAY of { section, score }", () => {
    const raw = [
      { section: "vision", score: 3.5 },
      { section: "productivity", score: 2.0, count: 4 },
    ]
    const out = normalizeSectionScores(raw)
    expect(out).toEqual([
      { section: "vision", score: 3.5, count: undefined },
      { section: "productivity", score: 2.0, count: 4 },
    ])
  })

  it("falls back to score/weighted when mean is absent", () => {
    expect(normalizeSectionScores({ a: { score: 5 } })[0].score).toBe(5)
    expect(normalizeSectionScores({ a: { weighted: 2.5 } })[0].score).toBe(2.5)
  })

  it("returns [] for null/undefined without throwing", () => {
    expect(normalizeSectionScores(null)).toEqual([])
    expect(normalizeSectionScores(undefined)).toEqual([])
  })
})
