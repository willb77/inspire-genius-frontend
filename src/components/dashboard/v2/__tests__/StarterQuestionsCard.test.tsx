import { fireEvent, render, screen } from "@testing-library/react"

import { StarterQuestionsCard } from "../StarterQuestionsCard"

const QUESTIONS = ["How do I read my PRISM report?"]

describe("StarterQuestionsCard", () => {
  it("renders the default engages label", () => {
    render(
      <StarterQuestionsCard
        onAsk={jest.fn()}
        questions={QUESTIONS}
        onSelectQuestion={jest.fn()}
      />
    )

    expect(
      screen.getByText("MERIDIAN ENGAGES: ALEX · AURA · BRIDGE · ECHO")
    ).toBeInTheDocument()
  })

  it("calls onAsk with the trimmed text when Enter is pressed, then clears", () => {
    const onAsk = jest.fn()
    render(
      <StarterQuestionsCard
        onAsk={onAsk}
        questions={QUESTIONS}
        onSelectQuestion={jest.fn()}
      />
    )

    const input = screen.getByPlaceholderText(
      "What would you like to ask Meridian?"
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: "Tell me about Aura" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(onAsk).toHaveBeenCalledTimes(1)
    expect(onAsk).toHaveBeenCalledWith("Tell me about Aura")
    expect(input.value).toBe("")
  })

  it("calls onSelectQuestion with the question when a chip is clicked", () => {
    const onSelectQuestion = jest.fn()
    render(
      <StarterQuestionsCard
        onAsk={jest.fn()}
        questions={QUESTIONS}
        onSelectQuestion={onSelectQuestion}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: "How do I read my PRISM report?" })
    )

    expect(onSelectQuestion).toHaveBeenCalledTimes(1)
    expect(onSelectQuestion).toHaveBeenCalledWith(
      "How do I read my PRISM report?"
    )
  })

  it("does not call onAsk when submitting empty/whitespace input", () => {
    const onAsk = jest.fn()
    render(
      <StarterQuestionsCard
        onAsk={onAsk}
        questions={QUESTIONS}
        onSelectQuestion={jest.fn()}
      />
    )

    const input = screen.getByPlaceholderText(
      "What would you like to ask Meridian?"
    )
    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.keyDown(input, { key: "Enter" })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))

    expect(onAsk).not.toHaveBeenCalled()
  })
})
