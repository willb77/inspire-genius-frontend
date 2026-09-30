import { toSavedRun, toSavedScenario } from "../savedAnalysis"
import type { SavedAnalysis } from "@/services/manager/development/growthService"

/**
 * Reading `growth.team_studio_analyses.inputs`, which is opaque JSONB (TDS-3).
 *
 * The server validates nothing inside `inputs` (`Optional[dict]`), so every
 * reader is reading untrusted shape. These tests are mostly about the ugly
 * cases, because the pretty one is the one that gets written by hand and the
 * ugly ones are what put the literal string "undefined" into a manager's
 * exported document about a named colleague.
 *
 * Invented people — this repo is public.
 */

function row(over: Partial<SavedAnalysis> = {}): SavedAnalysis {
  return {
    id: "a-1",
    memberId: "m-1",
    kind: "compare",
    title: "Dana Whitfield vs Rowan Escobar",
    content: "## Friction and fit\n\nThey disagree about pace.",
    inputs: {
      subjectIds: ["m-1", "m-2"],
      subjectNames: ["Dana Whitfield", "Rowan Escobar"],
      notice: "Generated from scores on file.",
    },
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: null,
    ...over,
  }
}

describe("toSavedRun — narrowing an untyped blob", () => {
  it("reads back what this client wrote", () => {
    const run = toSavedRun(row(), "Comparison")
    expect(run).toEqual({
      id: "a-1",
      title: "Dana Whitfield vs Rowan Escobar",
      body: "## Friction and fit\n\nThey disagree about pace.",
      subjectIds: ["m-1", "m-2"],
      subjectNames: ["Dana Whitfield", "Rowan Escobar"],
      notice: "Generated from scores on file.",
      createdAt: "2026-09-20T10:00:00Z",
    })
  })

  /**
   * The failure this exists to prevent: a `String(inputs.notice)` over a
   * missing key yields the literal "undefined", which is then printed at the
   * top of an exported PDF about a real colleague, where the caveat should be.
   */
  it("a missing notice is an empty string, never the word 'undefined'", () => {
    const run = toSavedRun(row({ inputs: null }), "Comparison")
    expect(run.notice).toBe("")
    expect(run.notice).not.toMatch(/undefined/)
  })

  it("rejects wrongly-typed fields rather than passing them through", () => {
    const run = toSavedRun(
      row({
        inputs: {
          subjectIds: "m-1",
          subjectNames: ["Dana Whitfield", 42, null],
          notice: { text: "nope" },
        },
      }),
      "Comparison",
    )
    expect(run.subjectIds).toEqual([])
    expect(run.subjectNames).toEqual(["Dana Whitfield"])
    expect(run.notice).toBe("")
  })

  /**
   * An untitled row must still be identifiable. A blank row in a list is
   * indistinguishable from a rendering bug, and the manager cannot tell which
   * of their saved documents it is.
   */
  it("falls back to the document's first line, then to a fixed label", () => {
    expect(toSavedRun(row({ title: "   " }), "Comparison").title).toBe("## Friction and fit")
    expect(toSavedRun(row({ title: null, content: "" }), "Comparison").title).toBe("Comparison")
    expect(toSavedRun(row({ title: undefined, content: "\n\n  \n" }), "Comparison").title).toBe(
      "Comparison",
    )
  })

  it("a missing createdAt is null, not a date that reads as today", () => {
    expect(toSavedRun(row({ createdAt: undefined }), "Comparison").createdAt).toBeNull()
  })
})

describe("toSavedScenario — the shape the shared ScenarioPanel replays", () => {
  function scenarioRow(over: Partial<SavedAnalysis> = {}): SavedAnalysis {
    return row({
      kind: "scenario",
      title: "The Q3 handover",
      content: "## Dana Whitfield\n\nasks for the detail\n\n## Together\n\nthey converge",
      inputs: {
        subjectIds: ["m-1", "m-2"],
        subjectNames: ["Dana Whitfield", "Rowan Escobar"],
        situation: "A deadline has moved forward by two weeks.",
        notice: "Behaviour is a prediction about tendencies.",
        result: {
          individual: { "m-1": "asks for the detail", "m-2": "pushes for a decision" },
          collaborative: "they converge",
        },
      },
      ...over,
    })
  }

  it("restores the per-person sections so 'Open' is a real re-open", () => {
    const s = toSavedScenario(scenarioRow(), "Scenario")
    expect(s.title).toBe("The Q3 handover")
    expect(s.situation).toBe("A deadline has moved forward by two weeks.")
    expect(s.character_ids).toEqual(["m-1", "m-2"])
    expect(s.character_names).toEqual(["Dana Whitfield", "Rowan Escobar"])
    expect(s.result.individual).toEqual({
      "m-1": "asks for the detail",
      "m-2": "pushes for a decision",
    })
    expect(s.result.collaborative).toBe("they converge")
  })

  /**
   * A row this client did not write. It is LISTED rather than dropped — a row
   * silently absent from the list is the failure this codebase keeps having to
   * defend against — and the document it does carry is put under the group read
   * rather than fabricated per person.
   */
  it("a row with no replayable result is still listed, carrying the text it does have", () => {
    const s = toSavedScenario(scenarioRow({ inputs: { subjectNames: ["Dana Whitfield"] } }), "Scenario")
    expect(s.result.individual).toEqual({})
    expect(s.result.collaborative).toBe(
      "## Dana Whitfield\n\nasks for the detail\n\n## Together\n\nthey converge",
    )
    expect(s.situation).toBe("")
    expect(s.character_ids).toEqual([])
  })

  it("drops non-string sections rather than rendering them", () => {
    const s = toSavedScenario(
      scenarioRow({
        inputs: {
          result: { individual: { "m-1": "kept", "m-2": { nested: true } }, collaborative: 7 },
        },
      }),
      "Scenario",
    )
    expect(s.result.individual).toEqual({ "m-1": "kept" })
    expect(s.result.collaborative).toBe("")
  })
})
