import {
  RESULT_CAP,
  capAppliesToMode,
  effectiveScore,
  isCapped,
  runningTally,
} from "../effectiveScore"

const NOT_CAPPED = { applied: false, reason: null }
const CAPPED = { applied: true, reason: "no_measurable_result" }

describe("effectiveScore — what a rating counts as", () => {
  it("mirrors the server's STAR cap of 3", () => {
    expect(RESULT_CAP).toBe(3)
  })

  it("is the rating itself when nothing was capped, whatever shape `capped` arrives in", () => {
    // `capped` is an OBJECT on the wire. Keying on its truthiness would cap the
    // {applied:false} answer — the defect this file must never reintroduce.
    expect(effectiveScore({ final_score: 4, capped: NOT_CAPPED })).toBe(4)
    expect(effectiveScore({ final_score: 4, capped: undefined })).toBe(4)
    expect(effectiveScore({ final_score: 4, capped: null })).toBe(4)
    expect(effectiveScore({ final_score: 4, capped: {} as never })).toBe(4)
    expect(effectiveScore({ final_score: 5 })).toBe(5)
  })

  it("is the cap when the server applied it", () => {
    expect(effectiveScore({ final_score: 4, capped: CAPPED })).toBe(3)
    expect(effectiveScore({ final_score: 5, capped: CAPPED })).toBe(3)
  })

  it("never raises a rating that was already at or below the cap", () => {
    expect(effectiveScore({ final_score: 2, capped: CAPPED })).toBe(2)
    expect(effectiveScore({ final_score: 3, capped: CAPPED })).toBe(3)
  })

  it("is null when there is no numeric rating", () => {
    expect(effectiveScore({ final_score: null, capped: CAPPED })).toBeNull()
    expect(effectiveScore({})).toBeNull()
    expect(effectiveScore(null)).toBeNull()
    expect(effectiveScore(undefined)).toBeNull()
  })

  it("ignores a stale cap stamp on a CUSTOM session, which the server scores uncapped", () => {
    expect(effectiveScore({ final_score: 4, capped: CAPPED }, "custom")).toBe(4)
    expect(effectiveScore({ final_score: 4, capped: CAPPED }, " Custom ")).toBe(4)
    expect(isCapped({ final_score: 4, capped: CAPPED }, "custom")).toBe(false)
  })

  it("treats an absent mode, and 'star', as the STAR path", () => {
    expect(capAppliesToMode(undefined)).toBe(true)
    expect(capAppliesToMode(null)).toBe(true)
    expect(capAppliesToMode("star")).toBe(true)
    expect(capAppliesToMode("custom")).toBe(false)
    expect(effectiveScore({ final_score: 4, capped: CAPPED }, "star")).toBe(3)
  })
})

describe("isCapped", () => {
  it("is true only for applied === true", () => {
    expect(isCapped({ capped: CAPPED })).toBe(true)
    expect(isCapped({ capped: NOT_CAPPED })).toBe(false)
    expect(isCapped({ capped: { applied: "yes" } as never })).toBe(false)
    expect(isCapped({})).toBe(false)
    expect(isCapped(null)).toBe(false)
  })
})

describe("runningTally — the server's rule, mid-interview", () => {
  it("averages what each rating counts as, not the raw rating", () => {
    // The W5 case: one human 4 with no Result observed. Finalize says 3.00, so
    // the tally must not say 4.00 beforehand.
    expect(runningTally([{ final_score: 4, capped: CAPPED }])).toEqual({ count: 1, avg: 3 })
    expect(
      runningTally([
        { final_score: 4, capped: CAPPED },
        { final_score: 5, capped: NOT_CAPPED },
      ]),
    ).toEqual({ count: 2, avg: 4 })
  })

  it("counts only answers with a saved numeric rating", () => {
    expect(runningTally([null, undefined, { final_score: null }, { final_score: 2 }])).toEqual({
      count: 1,
      avg: 2,
    })
  })

  it("is empty with nothing rated", () => {
    expect(runningTally([])).toEqual({ count: 0, avg: null })
    expect(runningTally([null])).toEqual({ count: 0, avg: null })
  })

  it("uses the raw rating on a custom session", () => {
    expect(runningTally([{ final_score: 4, capped: CAPPED }], "custom")).toEqual({ count: 1, avg: 4 })
  })
})
