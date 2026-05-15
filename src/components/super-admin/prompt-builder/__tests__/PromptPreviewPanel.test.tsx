import { render, screen } from "@testing-library/react"
import PromptPreviewPanel from "../PromptPreviewPanel"

describe("PromptPreviewPanel", () => {
  const emptyProps = {
    persona: "",
    tone: "",
    knowledgeDomain: "",
    responseStyle: "",
    constraints: "",
  }

  it("renders the Live Preview title", () => {
    render(<PromptPreviewPanel {...emptyProps} />)
    expect(screen.getByText("Live Preview")).toBeInTheDocument()
  })

  it("shows placeholder text when all fields are empty", () => {
    render(<PromptPreviewPanel {...emptyProps} />)
    expect(screen.getByText(/Fill in the sections to see the assembled prompt/)).toBeInTheDocument()
  })

  it("displays assembled prompt when fields have content", () => {
    render(
      <PromptPreviewPanel
        persona="A wise mentor"
        tone="warm"
        knowledgeDomain=""
        responseStyle=""
        constraints=""
      />
    )
    expect(screen.getByText(/## Persona/)).toBeInTheDocument()
    expect(screen.getByText(/A wise mentor/)).toBeInTheDocument()
    expect(screen.getByText(/## Tone/)).toBeInTheDocument()
  })

  it("renders copy button", () => {
    render(<PromptPreviewPanel {...emptyProps} />)
    // Copy button is a ghost button with an icon
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(0)
  })

  it("only includes sections with content", () => {
    const { container } = render(
      <PromptPreviewPanel
        persona="Test"
        tone=""
        knowledgeDomain=""
        responseStyle=""
        constraints=""
      />
    )
    const pre = container.querySelector("pre")
    expect(pre?.textContent).toContain("## Persona")
    expect(pre?.textContent).not.toContain("## Tone")
  })
})
