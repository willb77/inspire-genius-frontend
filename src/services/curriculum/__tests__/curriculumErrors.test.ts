import { curriculumError, errorStatus } from "../curriculumErrors"

const http = (status: number, detail: unknown) => ({ response: { status, data: { detail } } })

const REPORT = {
  ok: false,
  counts: { courses: 2, programs: 0, requirementGroups: 0, prerequisiteLinks: 2 },
  errors: [],
  unknownCodes: [],
  cycles: [["ENG 112", "ENG 111", "ENG 112"]],
  credits: [],
  warnings: [],
}

describe("curriculumError", () => {
  it("reads a plain string detail", () => {
    expect(curriculumError(http(403, "Curriculum is not switched on yet on this tier."), "fb")).toEqual({
      status: 403,
      message: "Curriculum is not switched on yet on this tier.",
      report: null,
      items: [],
    })
  })

  it("keeps the message AND the report of a {message, report} refusal (apiErrorMessage would drop both)", () => {
    const e = curriculumError(
      http(409, { message: "That would make a requirement loop: ENG 112 → ENG 111 → ENG 112", report: REPORT }),
      "fb"
    )
    expect(e.status).toBe(409)
    expect(e.message).toContain("ENG 112 → ENG 111 → ENG 112")
    expect(e.report?.cycles).toEqual([["ENG 112", "ENG 111", "ENG 112"]])
  })

  it("lists field errors and what still references a course", () => {
    expect(curriculumError(http(422, { message: "m", errors: ["a", "b", 3] }), "fb").items).toEqual(["a", "b"])
    expect(
      curriculumError(http(409, { message: "MAT 121 is still required by: course MAT 122", referencedBy: ["course MAT 122"] }), "fb")
        .items
    ).toEqual(["course MAT 122"])
  })

  it("falls back when an object detail has no message, and ignores a malformed report", () => {
    const e = curriculumError(http(409, { report: { nope: true } }), "fallback text")
    expect(e.message).toBe("fallback text")
    expect(e.report).toBeNull()
  })

  it("reads FastAPI's validation list and a network error", () => {
    expect(curriculumError(http(422, [{ loc: ["body", "code"], msg: "Field required" }]), "fb").message).toBe(
      "code: Field required"
    )
    const net = curriculumError(new Error("Network Error"), "fb")
    expect(net).toEqual({ status: null, message: "Network Error", report: null, items: [] })
  })

  it("errorStatus", () => {
    expect(errorStatus(http(404, "x"))).toBe(404)
    expect(errorStatus(new Error("x"))).toBeNull()
  })
})
