import {
  parseStarterQuestion,
  toAnalysisPart,
  toAskResult,
  toComparisonPart,
  toScenarioPart,
  toStarterQuestions,
} from "../adapt"

/**
 * Fixtures are the SERVER's shape, transcribed from
 * `services/agent-engine/app/routes/team_studio.py`.
 *
 * Every endpoint there returns `{"status": "success", "data": {...}}` where the
 * inner object is `{markdown, notice}` — plus `part`/`parts` on `/analyse` and
 * `/compare`. The words `analysis`, `comparison`, `behaviour` and `answer`
 * appear nowhere in that module; they are the CHARACTER LAB's field names, and
 * the panels read them because that is the backend they were written against.
 *
 * The previous tests authored the panel-side shape and asserted it survived a
 * round trip, which is true of any object and proves nothing. These start from
 * what the server sends, so they fail if either side moves.
 */
const ANALYSE_WIRE = { part: 0, parts: 7, markdown: "## Where they start\nProse.", notice: "REAL PERSON — …" }
const COMPARE_WIRE = { part: 1, parts: 4, markdown: "## Friction\nProse.", notice: "REAL PERSON — …" }
const PLAIN_WIRE = { markdown: "Prose.", notice: "REAL PERSON — …" }

describe("the field the panels read is the field the server sends", () => {
  it("maps /analyse markdown onto `analysis`", () => {
    const part = toAnalysisPart(ANALYSE_WIRE, "Ada Lovelace")
    expect(part.analysis).toBe("## Where they start\nProse.")
    expect(part.parts).toBe(7)
    expect(part.name).toBe("Ada Lovelace")
    expect(part.notice).toBe("REAL PERSON — …")
  })

  it("maps /compare markdown onto `comparison`", () => {
    const part = toComparisonPart(COMPARE_WIRE, ["Ada", "Grace"])
    expect(part.comparison).toBe("## Friction\nProse.")
    expect(part.part).toBe(1)
    expect(part.parts).toBe(4)
    expect(part.names).toEqual(["Ada", "Grace"])
  })

  it("maps /scenario markdown onto `behaviour`, keeping the focus it was asked for", () => {
    const part = toScenarioPart(PLAIN_WIRE, "member-7", ["Ada"])
    expect(part.behaviour).toBe("Prose.")
    expect(part.focus).toBe("member-7")
  })

  it("maps /ask markdown onto `answer`, echoing the question asked", () => {
    const r = toAskResult(PLAIN_WIRE, "Who leads the handover?", ["Ada", "Grace"])
    expect(r.answer).toBe("Prose.")
    expect(r.question).toBe("Who leads the handover?")
  })

  /**
   * The regression guard. Before the adapter, the panel read `comparison` off a
   * body carrying only `markdown` and rendered nothing — with a 200 in the
   * access log and the prose already paid for. An adapter that returned the
   * wire body unchanged would reintroduce exactly that.
   */
  it("never returns the raw wire body — a passthrough is the original defect", () => {
    expect(toComparisonPart(COMPARE_WIRE, []).comparison).not.toBeUndefined()
    expect(toAnalysisPart(ANALYSE_WIRE, "x").analysis).not.toBeUndefined()
    expect(toScenarioPart(PLAIN_WIRE, "f", []).behaviour).not.toBeUndefined()
  })

  it("survives a body with no markdown rather than rendering `undefined`", () => {
    expect(toComparisonPart({}, []).comparison).toBe("")
    expect(toAnalysisPart({}, "x").analysis).toBe("")
    expect(toStarterQuestions({}, []).questions).toEqual([])
  })
})

describe("starter questions: a markdown list becomes clickable prompts", () => {
  // What the prompt in team_studio.py asks the model for: a markdown list,
  // each item grounded in a named score given in parentheses.
  const WIRE = {
    notice: "REAL PERSON — …",
    markdown: [
      "- When does planning start to feel like delay to you? (Finishing 96)",
      "- What does a good handover look like from where you sit? (Coordinating 8)",
      "* Where would you push back on this profile? (Innovating 95)",
      "1. What would you want more of next quarter? (Initiating 75)",
    ].join("\n"),
  }

  it("splits each bullet into the question and the score behind it", () => {
    const out = toStarterQuestions(WIRE, ["Ada"])
    expect(out.questions).toHaveLength(4)
    expect(out.questions[0]).toEqual({
      question: "When does planning start to feel like delay to you?",
      why: "Finishing 96",
    })
    expect(out.questions[3].question).toBe("What would you want more of next quarter?")
    expect(out.questions[3].why).toBe("Initiating 75")
  })

  it("takes only list items — a preamble is not a question", () => {
    const out = toStarterQuestions(
      { markdown: "Here are six questions:\n\n- A real one? (Focusing 19)\n\nAsk gently." },
      [],
    )
    expect(out.questions).toEqual([{ question: "A real one?", why: "Focusing 19" }])
  })

  it("keeps a bullet with no parenthetical whole rather than guessing where it splits", () => {
    expect(parseStarterQuestion("How did that land with the team?")).toEqual({
      question: "How did that land with the team?",
      why: "",
    })
  })

  it("does not mistake a mid-sentence parenthesis for the reason", () => {
    const q = parseStarterQuestion("What did the review (the second one) change? (Evaluating 88)")
    expect(q.question).toBe("What did the review (the second one) change?")
    expect(q.why).toBe("Evaluating 88")
  })

  it("strips emphasis so a bold question is not rendered with asterisks", () => {
    expect(parseStarterQuestion("**When do you decide it is finished?** (Finishing 96)")).toEqual({
      question: "When do you decide it is finished?",
      why: "Finishing 96",
    })
  })

  it("returns none for prose with no list, so the panel can say so", () => {
    // The panel warns "No questions came back" on an empty array. Inventing one
    // question from a paragraph would put words in the manager's mouth.
    expect(toStarterQuestions({ markdown: "I could not answer that." }, []).questions).toEqual([])
  })
})
