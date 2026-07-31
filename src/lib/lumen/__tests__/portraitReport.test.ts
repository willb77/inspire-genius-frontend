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
