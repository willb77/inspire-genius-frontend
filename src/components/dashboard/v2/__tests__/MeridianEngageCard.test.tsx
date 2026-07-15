import { fireEvent, render, screen } from "@testing-library/react"

import {
  MeridianEngageCard,
  type MeridianQuickChip,
} from "../MeridianEngageCard"

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

  it("renders the Starter Questions dropdown and calls onQuickChip on select", () => {
    const onQuickChip = jest.fn()
    const quickChips: MeridianQuickChip[] = [
      { label: "Personal", prompt: "Tell me about my profile" },
      { label: "Career", prompt: "Explore careers that fit me" },
      { label: "Education", prompt: "What training fits my goals?" },
    ]

    render(
      <MeridianEngageCard
        onAsk={jest.fn()}
        quickChips={quickChips}
        onQuickChip={onQuickChip}
      />,
    )

    // Dropdown is open by default, so the categories are visible.
    expect(screen.getByText("Starter Questions")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Career" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Personal" }))

    expect(onQuickChip).toHaveBeenCalledTimes(1)
    expect(onQuickChip).toHaveBeenCalledWith(quickChips[0])
  })

  it("renders no Starter Questions when no chips are provided", () => {
    render(<MeridianEngageCard onAsk={jest.fn()} />)

    expect(screen.queryByText("Starter Questions")).not.toBeInTheDocument()
  })
})
