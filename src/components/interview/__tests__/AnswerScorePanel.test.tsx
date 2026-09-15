/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import AnswerScorePanel from "../AnswerScorePanel"
import type { LivePlanQuestion, StarEvidence, SubmitAnswerResult } from "@/services/interview/live.service"

const QUESTION: LivePlanQuestion = {
  competency_id: "vision.strategic_thinking",
  section: "Vision & Strategy",
  question: "Tell me about a time you set direction under uncertainty.",
  competency_label: "Strategic Thinking",
  star_probes: ["What was the situation?"],
}

const EVIDENCE: StarEvidence = {
  S: { present: true },
  T: { present: true },
  A: { present: false },
  R: { present: true },
}

// The real wire shape. `capped` is an OBJECT and always has been — the server
// sends {applied:false, reason:null} for an answer it did NOT cap. This fixture
// said `capped: false` until 2026-09-14, which is why no test here ever saw the
// defect below: the fixture and the type shared the same wrong belief, and the
// app produced something else.
const NOT_CAPPED = { applied: false, reason: null }
const CAPPED = { applied: true, reason: "no_measurable_result" }

const SUGGESTION: SubmitAnswerResult = {
  answer_id: "ans-1",
  suggested_score: 3,
  star_evidence: EVIDENCE,
  capped: NOT_CAPPED,
}

describe("AnswerScorePanel", () => {
  it("submits the captured answer text via onSubmitAnswer", async () => {
    const user = userEvent.setup()
    const onSubmitAnswer = jest.fn()
    const onSaveScore = jest.fn()

    render(
      <AnswerScorePanel
        question={QUESTION}
        number={1}
        total={3}
        consentMode="no_audio"
        suggestion={null}
        scored={null}
        onSubmitAnswer={onSubmitAnswer}
        onSaveScore={onSaveScore}
      />,
    )

    await user.type(screen.getByLabelText("Captured answer"), "They led a re-org under a tight deadline.")
    await user.click(screen.getByRole("button", { name: /submit answer/i }))

    expect(onSubmitAnswer).toHaveBeenCalledWith("They led a re-org under a tight deadline.")
    // No advisory yet, so the authoritative control must not be visible.
    expect(screen.queryByRole("radiogroup", { name: /authoritative score/i })).not.toBeInTheDocument()
  })

  it("sends the EDITED authoritative rating as final_score, not the advisory suggestion", async () => {
    const user = userEvent.setup()
    const onSubmitAnswer = jest.fn()
    const onSaveScore = jest.fn()

    render(
      <AnswerScorePanel
        question={QUESTION}
        number={1}
        total={3}
        consentMode="no_audio"
        suggestion={SUGGESTION}
        scored={null}
        onSubmitAnswer={onSubmitAnswer}
        onSaveScore={onSaveScore}
      />,
    )

    // Advisory suggestion is shown, clearly labelled.
    expect(screen.getByText(/AI suggestion — you decide/i)).toBeInTheDocument()
    expect(screen.getByText("3", { selector: "span.font-semibold" })).toBeInTheDocument()

    const scoreGroup = screen.getByRole("radiogroup", { name: /authoritative score/i })
    // The authoritative control starts seeded from the suggestion (3)…
    expect(screen.getByRole("radio", { name: "3" })).toHaveAttribute("aria-checked", "true")

    // …but the interviewer overrides it to 5.
    await user.click(screen.getByRole("radio", { name: "5" }))
    expect(scoreGroup).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /save rating/i }))

    expect(onSaveScore).toHaveBeenCalledTimes(1)
    // The value sent is the EDITED rating (5), never the advisory suggestion (3).
    expect(onSaveScore).toHaveBeenCalledWith(5, "")
    expect(onSaveScore).not.toHaveBeenCalledWith(3, expect.anything())
  })

  it("includes interviewer notes alongside the edited score", async () => {
    const user = userEvent.setup()
    const onSaveScore = jest.fn()

    render(
      <AnswerScorePanel
        question={QUESTION}
        number={1}
        total={3}
        consentMode="no_audio"
        suggestion={SUGGESTION}
        scored={null}
        onSubmitAnswer={jest.fn()}
        onSaveScore={onSaveScore}
      />,
    )

    await user.click(screen.getByRole("radio", { name: "2" }))
    await user.type(screen.getByLabelText("Interviewer notes"), "Weak on the Result element.")
    await user.click(screen.getByRole("button", { name: /save rating/i }))

    expect(onSaveScore).toHaveBeenCalledWith(2, "Weak on the Result element.")
  })
})

describe("the Result-cap note", () => {
  const base = {
    question: QUESTION,
    number: 1,
    total: 1,
    consentMode: "no_audio" as const,
    scored: null,
    onSubmitAnswer: jest.fn(),
    onSaveScore: jest.fn(),
  }

  it("says nothing when the answer was not capped", () => {
    // The reported defect. `capped` is an object, so the old
    // `{capped && ...}` render showed the amber note on EVERY rated answer —
    // in a hiring interview too, not only a discovery one.
    render(<AnswerScorePanel {...base} suggestion={{ ...SUGGESTION, capped: NOT_CAPPED }} />)
    expect(screen.queryByText(/capped/i)).not.toBeInTheDocument()
  })

  it("names the rule when the answer WAS capped", () => {
    render(<AnswerScorePanel {...base} suggestion={{ ...SUGGESTION, capped: CAPPED }} />)
    expect(screen.getByText(/capped at 3 — no measurable result yet/i)).toBeInTheDocument()
  })

  it("says nothing when the server sent no cap information at all", () => {
    render(<AnswerScorePanel {...base} suggestion={{ ...SUGGESTION, capped: undefined }} />)
    expect(screen.queryByText(/capped/i)).not.toBeInTheDocument()
  })
})

describe("a development conversation is framed as one", () => {
  const base = {
    question: QUESTION,
    number: 1,
    total: 1,
    consentMode: "no_audio" as const,
    scored: null,
    suggestion: SUGGESTION,
    onSubmitAnswer: jest.fn(),
    onSaveScore: jest.fn(),
  }

  it("reads the STAR row as description, not as a checklist", () => {
    render(<AnswerScorePanel {...base} developmentMode />)
    expect(screen.getByText(/descriptive only/i)).toBeInTheDocument()
    expect(screen.getByText(/not scored on the STAR arc/i)).toBeInTheDocument()
  })

  it("leaves a hiring interview's STAR row exactly as it was", () => {
    render(<AnswerScorePanel {...base} />)
    expect(screen.queryByText(/descriptive only/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Situation/)).toBeInTheDocument()
  })
})
