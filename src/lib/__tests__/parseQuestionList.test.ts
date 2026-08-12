import { parseQuestionList, MAX_PARSED_QUESTIONS } from "../parseQuestionList"

describe("parseQuestionList", () => {
  it("returns [] for empty / whitespace input", () => {
    expect(parseQuestionList("")).toEqual([])
    expect(parseQuestionList("   \n  \n")).toEqual([])
  })

  it("takes one question per non-empty line", () => {
    const out = parseQuestionList("What are your goals?\nWhy this field?\n\nWhat challenges you?")
    expect(out).toEqual(["What are your goals?", "Why this field?", "What challenges you?"])
  })

  it("strips numbering, bullets, and Q: prefixes", () => {
    const text = ["1. First question?", "2) Second question?", "- Third question?", "• Fourth?", "Q: Fifth?", "Q3. Sixth?"].join("\n")
    expect(parseQuestionList(text)).toEqual([
      "First question?",
      "Second question?",
      "Third question?",
      "Fourth?",
      "Fifth?",
      "Sixth?",
    ])
  })

  it("drops exact duplicates (case-insensitive), preserving order", () => {
    const out = parseQuestionList("Same question\nsame question\nDifferent one")
    expect(out).toEqual(["Same question", "Different one"])
  })

  it("skips lines shorter than the minimum", () => {
    expect(parseQuestionList("ok\nA valid question here")).toEqual(["A valid question here"])
  })

  it("caps at MAX_PARSED_QUESTIONS", () => {
    const many = Array.from({ length: MAX_PARSED_QUESTIONS + 10 }, (_, i) => `Question number ${i}`).join("\n")
    expect(parseQuestionList(many)).toHaveLength(MAX_PARSED_QUESTIONS)
  })
})
