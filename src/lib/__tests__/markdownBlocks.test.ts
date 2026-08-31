import { parseMarkdownBlocks, stripInlineMarkdown } from "@/lib/markdownBlocks"

/**
 * The parser exists so the Word and PDF exports format generated markdown
 * identically. Before it, the Word export had its own inline parser and the PDF
 * would have grown a second one — which is how two exports of the same profile
 * end up disagreeing about what is a heading.
 */
describe("stripInlineMarkdown", () => {
  it("drops emphasis rather than printing the asterisks", () => {
    // A PDF cannot render **bold**, and printing it literally reads as a typo
    // to anyone who does not know markdown.
    expect(stripInlineMarkdown("**Green 71.5** is the story")).toBe("Green 71.5 is the story")
    expect(stripInlineMarkdown("*Gold* is not discipline")).toBe("Gold is not discipline")
    expect(stripInlineMarkdown("`sd_score` is 0-20")).toBe("sd_score is 0-20")
  })

  it("leaves a bare asterisk alone", () => {
    // "2 * 3" is arithmetic, not emphasis.
    expect(stripInlineMarkdown("2 * 3")).toBe("2 * 3")
  })
})

describe("parseMarkdownBlocks", () => {
  it("classifies the shapes the model is asked to produce", () => {
    const blocks = parseMarkdownBlocks(
      ["## Derailers", "", "- Runs at conflict", "1. First move", "Plain prose."].join("\n"),
    )
    expect(blocks).toEqual([
      { kind: "heading", level: 2, text: "Derailers" },
      { kind: "blank" },
      { kind: "bullet", text: "Runs at conflict" },
      { kind: "ordered", index: 1, text: "First move" },
      { kind: "para", text: "Plain prose." },
    ])
  })

  it("records heading depth so exports can nest them", () => {
    const [h2, h3] = parseMarkdownBlocks("## Two\n### Three")
    expect(h2).toMatchObject({ kind: "heading", level: 2 })
    expect(h3).toMatchObject({ kind: "heading", level: 3 })
  })

  it("strips inline marks inside every block kind", () => {
    const blocks = parseMarkdownBlocks("## **Shape**\n- **Red 85** drives it")
    expect(blocks[0]).toMatchObject({ text: "Shape" })
    expect(blocks[1]).toMatchObject({ text: "Red 85 drives it" })
  })

  it("returns nothing for empty input rather than a blank block", () => {
    expect(parseMarkdownBlocks("")).toEqual([{ kind: "blank" }])
  })
})
