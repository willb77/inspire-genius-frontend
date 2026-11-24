import { briefDescription, BRIEF_MAX } from "../eventSummary"

describe("briefDescription", () => {
  it("is empty for nothing", () => {
    expect(briefDescription(null)).toBe("")
    expect(briefDescription("  \n\n ")).toBe("")
  })
  it("takes the first paragraph and drops the formatting marks", () => {
    expect(briefDescription("**Join** us for *a look* at [PRISM](https://x.example).\n\nSecond paragraph.")).toBe(
      "Join us for a look at PRISM.",
    )
  })
  it("drops list markers and keeps escaped characters", () => {
    expect(briefDescription("- first\n- second")).toBe("first second")
    expect(briefDescription("Cost: 5 \\* 3")).toBe("Cost: 5 3")
    expect(briefDescription("Free * entry ** today")).not.toContain("*")
  })
  it("cuts at a word boundary with an ellipsis, never past the limit", () => {
    const out = briefDescription("alpha ".repeat(60))
    expect(out.endsWith("…")).toBe(true)
    expect(out.length).toBeLessThanOrEqual(BRIEF_MAX + 1)
    expect(out).not.toMatch(/alph…$/)
  })
  it("leaves a short text alone", () => {
    expect(briefDescription("Short and sweet.")).toBe("Short and sweet.")
  })
  it("never produces HTML: markup stays literal characters", () => {
    expect(briefDescription("<img src=x onerror=1>")).toBe("<img src=x onerror=1>")
  })
})
