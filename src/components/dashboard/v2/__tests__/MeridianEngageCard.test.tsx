import { fireEvent, render, screen } from "@testing-library/react"

import {
  MeridianEngageCard,
  type StarterQuestionGroup,
} from "../MeridianEngageCard"

const GROUPS: StarterQuestionGroup[] = [
  {
    category: "New to Inspires Genius",
    questions: [
      "What's the first thing I should do?",
      "What is a brain map?",
    ],
  },
  {
    category: "Personal & career goals",
    questions: ["Map out a 90-day plan toward my goal."],
  },
]

describe("MeridianEngageCard", () => {
  it("renders the Chat with Meridian header and personalized greeting", () => {
    render(<MeridianEngageCard onAsk={jest.fn()} firstName="Will" />)

    expect(screen.getByText("Chat with Meridian")).toBeInTheDocument()
    expect(
      screen.getByText(/I'm Meridian, and I'll be your guide/),
    ).toBeInTheDocument()
  })

  it("starts with an empty ask box", () => {
    render(<MeridianEngageCard onAsk={jest.fn()} />)

    expect(screen.getByLabelText("Chat with Meridian")).toHaveValue("")
  })

  it("calls onAsk with the typed text when send is clicked", () => {
    const onAsk = jest.fn()

    render(<MeridianEngageCard onAsk={onAsk} />)

    fireEvent.change(screen.getByLabelText("Chat with Meridian"), {
      target: { value: "How do I even start?" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))

    expect(onAsk).toHaveBeenCalledTimes(1)
    expect(onAsk).toHaveBeenCalledWith("How do I even start?")
  })

  it("does not call onAsk when the ask box is empty", () => {
    const onAsk = jest.fn()

    render(<MeridianEngageCard onAsk={onAsk} />)

    fireEvent.click(screen.getByRole("button", { name: "Send" }))

    expect(onAsk).not.toHaveBeenCalled()
  })

  it("renders grouped starter questions and calls onStarterQuestion on select", () => {
    const onStarterQuestion = jest.fn()

    render(
      <MeridianEngageCard
        onAsk={jest.fn()}
        starterGroups={GROUPS}
        onStarterQuestion={onStarterQuestion}
      />,
    )

    // Dropdown is open by default: category headers + questions are visible.
    expect(screen.getByText("Starter Questions")).toBeInTheDocument()
    expect(screen.getByText("New to Inspires Genius")).toBeInTheDocument()
    expect(screen.getByText("Personal & career goals")).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: "What is a brain map?" }),
    )

    expect(onStarterQuestion).toHaveBeenCalledTimes(1)
    expect(onStarterQuestion).toHaveBeenCalledWith("What is a brain map?")
  })

  it("can collapse the Starter Questions dropdown", () => {
    render(
      <MeridianEngageCard
        onAsk={jest.fn()}
        starterGroups={GROUPS}
        onStarterQuestion={jest.fn()}
      />,
    )

    // Open by default → the toggle collapses it.
    expect(screen.getByText("New to Inspires Genius")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Starter Questions/ }))
    expect(
      screen.queryByText("New to Inspires Genius"),
    ).not.toBeInTheDocument()
  })

  it("renders no Starter Questions when no groups are provided", () => {
    render(<MeridianEngageCard onAsk={jest.fn()} />)

    expect(screen.queryByText("Starter Questions")).not.toBeInTheDocument()
  })
})
