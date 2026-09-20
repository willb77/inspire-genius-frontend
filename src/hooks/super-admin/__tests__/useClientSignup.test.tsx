/**
 * Tests for `refusalMessages` / `refusalWarnings`.
 *
 * These are the highest-value unit in the Client Sign-Up frontend, because they
 * are the only thing standing between a correct server-side gate and a screen
 * that reads "Request failed with status code 409".
 *
 * That failure mode has real history here: the Team Development and Bio Capture
 * chat panels parsed an error frame into hook state and rendered it nowhere, so
 * a broken transport was indistinguishable from a slow one (agents.md §6). A
 * gate that refuses without saying why produces the same confusion, and the
 * gate is the part people ask to have switched off.
 */
import { refusalMessages, refusalWarnings } from "@/hooks/super-admin/useClientSignup"

/** Shapes an AxiosError closely enough for the helper's narrowing. */
function axios409(detail: unknown) {
  return {
    message: "Request failed with status code 409",
    response: { status: 409, data: { detail } },
  }
}

describe("refusalMessages", () => {
  it("lists every failed gate and missing field, not just the first", () => {
    const messages = refusalMessages(
      axios409({
        allowed: false,
        target_stage: "qualified",
        error: null,
        failed_gates: [
          { key: "qualification_call_held", label: "Qualification call held" },
          { key: "need_budget_authority_timing", label: "Need, budget, authority and timing recorded" },
        ],
        missing_fields: [
          { name: "decision_maker_name", label: "Decision maker / signer" },
          { name: "service_line", label: "Product / service line" },
        ],
      }),
    )

    expect(messages).toEqual([
      "Qualification call held",
      "Need, budget, authority and timing recorded",
      "Decision maker / signer is required",
      "Product / service line is required",
    ])
  })

  it("surfaces an illegal move's own reason", () => {
    expect(
      refusalMessages(
        axios409({
          allowed: false,
          target_stage: "proposal",
          error: "Cannot skip a stage — Qualified comes next",
          failed_gates: [],
          missing_fields: [],
        }),
      ),
    ).toEqual(["Cannot skip a stage — Qualified comes next"])
  })

  it("explains an empty SOW section in the document's own terms", () => {
    const messages = refusalMessages(
      axios409({ ok: false, empty_sections: [6, 11], missing_header: [], errors: [] }),
    )
    expect(messages).toHaveLength(2)
    expect(messages[0]).toContain("SOW section 6")
    expect(messages[0]).toContain("Not applicable")
  })

  it("passes a reconciliation failure through verbatim", () => {
    const messages = refusalMessages(
      axios409({
        ok: false,
        errors: [
          "Invoice schedule totals $40,000.00 but the SOW one-time total is $48,000.00 — these must be equal",
        ],
        warnings: [],
      }),
    )
    expect(messages[0]).toContain("must be equal")
  })

  it("combines a missing header with other errors", () => {
    const messages = refusalMessages(
      axios409({
        ok: false,
        empty_sections: [],
        missing_header: ["Client legal name"],
        errors: ["End date is before the start date"],
      }),
    )
    expect(messages).toEqual([
      "Client legal name is required",
      "End date is before the start date",
    ])
  })

  it("never returns an empty list for a refusal it cannot parse", () => {
    // An empty list would render as nothing at all, which reads as success.
    const messages = refusalMessages(axios409({ unexpected: "shape" }))
    expect(messages).toEqual(["The change was refused, and nothing was saved."])
  })

  it("says so plainly when the failure was a 403, not a gate", () => {
    expect(
      refusalMessages({ message: "Forbidden", response: { status: 403, data: {} } }),
    ).toEqual(["You do not have access to the client sign-up process."])
  })

  it("falls back to the transport error when there is no response at all", () => {
    expect(refusalMessages({ message: "Network Error" })).toEqual(["Network Error"])
  })

  it("does not throw on a non-axios value", () => {
    expect(() => refusalMessages(new Error("boom"))).not.toThrow()
    expect(refusalMessages(undefined)).toHaveLength(1)
  })
})

describe("refusalWarnings", () => {
  it("returns non-blocking advisories separately from errors", () => {
    const error = axios409({
      ok: true,
      errors: [],
      warnings: ["Recurring item 'Subscription' has no start date — recurring fees start at go-live"],
    })
    expect(refusalWarnings(error)).toHaveLength(1)
    // A warning must not be reported as a blocking error.
    expect(refusalMessages(error)).not.toContain(refusalWarnings(error)[0])
  })

  it("is empty when there are none", () => {
    expect(refusalWarnings(axios409({ ok: false, errors: ["x"] }))).toEqual([])
    expect(refusalWarnings(undefined)).toEqual([])
  })
})
