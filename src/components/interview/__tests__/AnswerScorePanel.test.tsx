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

const SUGGESTION: SubmitAnswerResult = {
  answer_id: "ans-1",
  suggested_score: 3,
  star_evidence: EVIDENCE,
  capped: false,
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
