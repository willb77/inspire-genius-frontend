import {
  buildPortraitReportText,
  buildPortraitReportHtml,
  buildPortraitReportDoc,
  portraitReportFileBase,
  type PortraitReportInput,
} from "../portraitReport"

const INPUT: PortraitReportInput = {
  headline: "Your PRISM profile leads Green.",
  description: "You lead with **steadiness**.\n\n- Calm under pressure\n- People-first",
  qa: [{ question: "Where are my blind spots?", answer: "You may act slowly." }],
  instruments: ["PRISM", "DISC"],
  coverage: "Composed from 2 sources.",
  disclaimer: "A mirror, not a diagnosis.",
}

describe("portraitReport", () => {
  test("file base is stable", () => {
    expect(portraitReportFileBase()).toBe("lumen_self-portrait")
  })

  test("text report carries the description, Q&A, and disclaimer", () => {
    const txt = buildPortraitReportText(INPUT)
    expect(txt).toContain("My Self-Portrait")
    expect(txt).toContain("steadiness")
    expect(txt).toContain("Q: Where are my blind spots?")
    expect(txt).toContain("A: You may act slowly.")
    expect(txt).toContain("A mirror, not a diagnosis.")
  })

  test("html renders bold and bullets and escapes HTML", () => {
    const html = buildPortraitReportHtml({
      ...INPUT,
      description: "Trouble with <script> & **bold**\n\n- one\n- two",
    })
    expect(html).toContain("<strong>bold</strong>")
    expect(html).toContain("<li>one</li>")
    // raw HTML in the model output is escaped, not injected
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
  })

  test("html includes the Q&A block", () => {
    const html = buildPortraitReportHtml(INPUT)
    expect(html).toContain("Questions &amp; answers")
    expect(html).toContain("Where are my blind spots?")
  })

  test("doc export is a Word blob", () => {
    const blob = buildPortraitReportDoc(INPUT)
    expect(blob.type).toBe("application/msword")
    expect(blob.size).toBeGreaterThan(0)
  })
})

/**
 * The exported report used to carry prose only. Someone who downloaded their
 * portrait got the narration describing scores the document did not contain.
 */
describe("portraitReport — scores and evidence", () => {
  const WITH_SCORES: PortraitReportInput = {
    ...INPUT,
    quadrants: [
      { label: "Green", value: 68 },
      { label: "Blue", value: 30 },
    ],
    dimensions: [
      { label: "Innovating", value: 90 },
      { label: "Initiating", value: 46 },
    ],
    orientation: [
      { label: "Introversion", value: 38 },
      { label: "Extroversion", value: 62 },
    ],
    scoreType: "Underlying",
    evidence: [{ source: "resume", detail: "Your résumé spans 2015 to 2024." }],
    evidenceNote: "Drawn from your own words, not from an assessment.",
  }

  test("text report carries the quadrants and the dimensions behind them", () => {
    const txt = buildPortraitReportText(WITH_SCORES)
    expect(txt).toContain("QUADRANT SCORES")
    expect(txt).toContain("Green: 68")
    expect(txt).toContain("BEHAVIOURAL DIMENSIONS (Underlying)")
    expect(txt).toContain("Innovating: 90")
  })

  test("text report says so when the score variant is unrecorded", () => {
    const txt = buildPortraitReportText({ ...WITH_SCORES, scoreType: null })
    expect(txt).toContain("score variant not recorded")
    expect(txt).not.toContain("(Underlying)")
  })

  test("energy direction is labelled as belonging to no quadrant", () => {
    const txt = buildPortraitReportText(WITH_SCORES)
    expect(txt).toContain("ENERGY DIRECTION (belongs to no quadrant)")

    const html = buildPortraitReportHtml(WITH_SCORES)
    expect(html).toContain("part of no quadrant")
  })

  test("evidence travels with its caveat in both formats", () => {
    const txt = buildPortraitReportText(WITH_SCORES)
    expect(txt).toContain("FROM YOUR OWN WORDS")
    expect(txt).toContain("not from an assessment")

    const html = buildPortraitReportHtml(WITH_SCORES)
    expect(html).toContain("From your own words")
    expect(html).toContain("not from an assessment")
  })

  test("evidence text is escaped — it comes from an uploaded resume", () => {
    const html = buildPortraitReportHtml({
      ...WITH_SCORES,
      evidence: [
        { source: "resume", detail: "R&D lead <script>alert(1)</script>" },
      ],
    })
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("R&amp;D")
  })

  test("a portrait with no scores still produces both formats", () => {
    const txt = buildPortraitReportText(INPUT)
    expect(txt).not.toContain("QUADRANT SCORES")
    expect(txt).toContain("My Self-Portrait")

    const html = buildPortraitReportHtml(INPUT)
    expect(html).not.toContain("Behavioural dimensions")
    expect(html).toContain("My Self-Portrait")
  })
})
