import {
  EMPTY_OUTCOME,
  isSocCode,
  makeOutcomesSchema,
  MAX_OUTCOMES_PER_PROGRAM,
  outcomeKey,
  toOutcomeInputs,
  toOutcomesValues,
} from "../outcomes.schemas"

const row = (over: Partial<typeof EMPTY_OUTCOME> = {}) => ({ ...EMPTY_OUTCOME, roleFamily: "Data & Quantitative", ...over })
const messages = (r: ReturnType<ReturnType<typeof makeOutcomesSchema>["safeParse"]>) =>
  r.success ? [] : r.error.issues.map((i) => i.message)

describe("outcomes.schemas — the CUR-3 outcome rules, before a round trip", () => {
  it("accepts SOC / O*NET codes in NN-NNNN or NN-NNNN.NN form only", () => {
    for (const ok of ["15-1252", "15-1252.00", " 29-1141 "]) expect(isSocCode(ok)).toBe(true)
    for (const bad of ["151252", "15-125", "15-12520", "15-1252.0", "15-1252.000", "AB-1234", "15-1252-00", ""]) {
      expect(isSocCode(bad)).toBe(false)
    }
  })

  it("refuses a malformed SOC code and allows an empty one", () => {
    const schema = makeOutcomesSchema()
    expect(schema.safeParse({ outcomes: [row({ socCode: "" })] }).success).toBe(true)
    expect(schema.safeParse({ outcomes: [row({ socCode: "15-1252.00" })] }).success).toBe(true)
    expect(messages(schema.safeParse({ outcomes: [row({ socCode: "151252" })] }))).toEqual([
      "Use NN-NNNN or NN-NNNN.NN (format only — not validated)",
    ])
  })

  it("requires a role family", () => {
    expect(messages(makeOutcomesSchema().safeParse({ outcomes: [row({ roleFamily: " " })] }))).toEqual([
      "Pick a role family",
    ])
  })

  it("allows at most 20 outcomes per program", () => {
    expect(MAX_OUTCOMES_PER_PROGRAM).toBe(20)
    const twenty = Array.from({ length: 20 }, (_, i) => row({ socCode: `15-${String(1000 + i)}` }))
    const schema = makeOutcomesSchema()
    expect(schema.safeParse({ outcomes: twenty }).success).toBe(true)
    expect(messages(schema.safeParse({ outcomes: [...twenty, row({ socCode: "15-2000" })] }))).toContain(
      "A program can have at most 20 outcomes"
    )
    expect(messages(makeOutcomesSchema(2).safeParse({ outcomes: twenty.slice(0, 3) }))).toContain(
      "A program can have at most 2 outcomes"
    )
  })

  it("refuses an exact repeat — family case and spacing, and id case, ignored", () => {
    const schema = makeOutcomesSchema()
    const r = schema.safeParse({
      outcomes: [
        row({ blueprintId: "ABC", socCode: "15-1252" }),
        row({ roleFamily: "data  &  quantitative", blueprintId: " abc ", socCode: "15-1252" }),
      ],
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("Outcome 2 repeats an earlier outcome")
      expect(r.error.issues[0].path).toEqual(["outcomes", 1, "roleFamily"])
    }
    expect(schema.safeParse({ outcomes: [row(), row({ socCode: "15-1252" })] }).success).toBe(true)
    expect(outcomeKey(row({ roleFamily: " Data & Quantitative " }))).toBe(outcomeKey(row()))
  })

  it("converts to the request body: trimmed, blanks to null", () => {
    expect(
      toOutcomeInputs({ outcomes: [row({ blueprintId: " id-1 ", socCode: " 15-1252 " }), row()] })
    ).toEqual([
      { roleFamily: "Data & Quantitative", blueprintId: "id-1", socCode: "15-1252" },
      { roleFamily: "Data & Quantitative", blueprintId: null, socCode: null },
    ])
    expect(
      toOutcomesValues([
        { roleFamily: "F", blueprintId: null, socCode: null, socCodeValidated: false, blueprint: null },
      ])
    ).toEqual({ outcomes: [{ roleFamily: "F", blueprintId: "", socCode: "" }] })
  })
})
