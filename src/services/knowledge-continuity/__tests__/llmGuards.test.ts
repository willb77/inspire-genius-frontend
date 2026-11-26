import {
  KCE_MAX_ANSWER,
  KCE_MAX_CONTEXT,
  KCE_MAX_ROLE_TITLE,
  KCE_MAX_TRANSCRIPT_CHARS,
  KCE_MAX_TRANSCRIPT_TURNS,
  fitsTranscriptBounds,
  kceGuardMessageKey,
  kceGuardRefusal,
  transcriptChars,
} from "../llmGuards"

describe("KCE model-route guards (client mirror)", () => {
  test("the limits match the server's (agent-engine kce_capture / kce_blueprint)", () => {
    expect(KCE_MAX_ROLE_TITLE).toBe(200)
    expect(KCE_MAX_ANSWER).toBe(10_000)
    expect(KCE_MAX_CONTEXT).toBe(20_000)
    expect(KCE_MAX_TRANSCRIPT_TURNS).toBe(60)
    expect(KCE_MAX_TRANSCRIPT_CHARS).toBe(120_000)
  })

  test("transcriptChars sums every question and answer", () => {
    expect(transcriptChars([])).toBe(0)
    expect(transcriptChars([{ question: "abc", answer: "de" }, { question: "f", answer: "" }])).toBe(6)
  })

  test("fitsTranscriptBounds holds at each edge and fails one past it", () => {
    const turn = { question: "q", answer: "a" }
    expect(fitsTranscriptBounds(Array(60).fill(turn))).toBe(true)
    expect(fitsTranscriptBounds(Array(61).fill(turn))).toBe(false)
    const big = { question: "q".repeat(1_000), answer: "a".repeat(1_000) }
    expect(fitsTranscriptBounds(Array(60).fill(big))).toBe(true)
    const over = [...Array(59).fill(big), { question: big.question, answer: big.answer + "a" }]
    expect(fitsTranscriptBounds(over)).toBe(false)
  })

  test.each([
    [403, "noAccess"],
    [429, "tooMany"],
    [422, "tooLong"],
    [413, "tooLong"],
    [400, undefined],
    [500, undefined],
  ])("status %s maps to %s", (status, refusal) => {
    expect(kceGuardRefusal({ response: { status } })).toBe(refusal)
  })

  test("non-HTTP errors map to nothing", () => {
    expect(kceGuardRefusal(undefined)).toBeUndefined()
    expect(kceGuardRefusal(null)).toBeUndefined()
    expect(kceGuardRefusal("x")).toBeUndefined()
    expect(kceGuardRefusal(new Error("network"))).toBeUndefined()
  })

  test("message keys live under kcPages.llmGuards", () => {
    expect(kceGuardMessageKey("noAccess")).toBe("llmGuards.noAccess")
    expect(kceGuardMessageKey("tooMany")).toBe("llmGuards.tooMany")
    expect(kceGuardMessageKey("tooLong")).toBe("llmGuards.tooLong")
  })
})
