import {
  KCE_MAX_ANSWER,
  KCE_MAX_CONTEXT,
  KCE_MAX_ROLE_TITLE,
  KCE_MAX_TRANSCRIPT_CHARS,
  KCE_MAX_TRANSCRIPT_TURNS,
  fitsTranscriptBounds,
  kceGuardMessageKey,
  kceGuardRefusal,
  kceGuardText,
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

  const ENTITLEMENT = "none of the verticals ['knowledge-continuity'] is enabled for this user"
  const ROLE_BP = "Blueprinting is available to practitioners, managers, company admins, and super admins only."
  const ROLE_CAP = "Knowledge capture is available to practitioners, managers, company admins, and super admins only."
  const e403 = (detail?: unknown) => ({ response: { status: 403, data: { detail } } })

  test("a 403 naming the verticals is the entitlement refusal", () => {
    expect(kceGuardRefusal(e403(ENTITLEMENT))).toBe("noAccess")
  })

  test.each([[ROLE_BP], [ROLE_CAP]])("a role 403 (%s) is roleNotAllowed", (detail) => {
    expect(kceGuardRefusal(e403(detail))).toBe("roleNotAllowed")
  })

  test.each([[undefined], [""], ["Forbidden"], [{ msg: "x" }], [["a"]]])(
    "an unknown 403 (%j) keeps noAccess",
    (detail) => {
      expect(kceGuardRefusal(e403(detail))).toBe("noAccess")
      expect(kceGuardRefusal({ response: { status: 403 } })).toBe("noAccess")
    }
  )

  test("kceGuardText gives the role copy, falling back to the server sentence", () => {
    const t = (key: string, o?: Record<string, unknown>) => (o?.defaultValue ? String(o.defaultValue) : key)
    expect(kceGuardText(e403(ROLE_BP), t)).toBe(ROLE_BP)
    expect(kceGuardText(e403(ENTITLEMENT), t)).toBe("llmGuards.noAccess")
    expect(kceGuardText(e403("Forbidden"), t)).toBe("llmGuards.noAccess")
    expect(kceGuardText({ response: { status: 500 } }, t)).toBeUndefined()
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
    expect(kceGuardMessageKey("roleNotAllowed")).toBe("llmGuards.roleNotAllowed")
  })
})
