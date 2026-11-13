import {
  KCE_ACCESS_DENIED_MESSAGE,
  KCE_SELF_IDENTITY,
  isKceAccessDenied,
  kceErrorDetail,
  kceErrorMessage,
  kceErrorStatus,
} from "../authz"

describe("KCE authz helpers", () => {
  test("only a 403 counts as an access refusal", () => {
    expect(isKceAccessDenied({ response: { status: 403 } })).toBe(true)
    for (const status of [401, 404, 422, 500]) {
      expect(isKceAccessDenied({ response: { status } })).toBe(false)
    }
    expect(isKceAccessDenied(new Error("network"))).toBe(false)
    expect(isKceAccessDenied(null)).toBe(false)
    expect(isKceAccessDenied(undefined)).toBe(false)
    expect(isKceAccessDenied("403")).toBe(false)
  })

  test("the message is the access notice on 403 and the caller's fallback otherwise", () => {
    expect(kceErrorMessage({ response: { status: 403 } }, "fallback")).toBe(KCE_ACCESS_DENIED_MESSAGE)
    expect(kceErrorMessage({ response: { status: 500 } }, "fallback")).toBe("fallback")
    expect(kceErrorMessage(new Error("x"), "fallback")).toBe("fallback")
  })

  test("status and detail are read defensively", () => {
    expect(kceErrorStatus({ response: { status: 418 } })).toBe(418)
    expect(kceErrorStatus({})).toBeUndefined()
    expect(kceErrorDetail({ response: { data: { detail: "consent needed" } } })).toBe("consent needed")
    // FastAPI sends a list on 422; that is not a usable string.
    expect(kceErrorDetail({ response: { data: { detail: [{ msg: "x" }] } } })).toBeUndefined()
    expect(kceErrorDetail(42)).toBeUndefined()
  })

  test("the notice and the identity constant are what the server contract expects", () => {
    expect(KCE_ACCESS_DENIED_MESSAGE).toBe("You don't have access to this organisation's knowledge.")
    expect(KCE_SELF_IDENTITY).toBe("self")
  })
})
