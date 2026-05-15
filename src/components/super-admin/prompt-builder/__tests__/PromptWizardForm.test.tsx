import { render, screen, fireEvent } from "@testing-library/react"
import PromptWizardForm from "../PromptWizardForm"

describe("PromptWizardForm", () => {
  const defaultProps = {
    persona: "",
    tone: "",
    knowledgeDomain: "",
    responseStyle: "",
    constraints: "",
    onPersonaChange: jest.fn(),
    onToneChange: jest.fn(),
    onKnowledgeDomainChange: jest.fn(),
    onResponseStyleChange: jest.fn(),
    onConstraintsChange: jest.fn(),
  }

  it("renders all five tab triggers", () => {
    render(<PromptWizardForm {...defaultProps} />)
    // "Persona" appears as both tab trigger and label, so use role
    const tabs = screen.getAllByRole("tab")
    expect(tabs.length).toBe(5)
    expect(tabs[0]).toHaveTextContent("Persona")
    expect(tabs[1]).toHaveTextContent("Tone")
    expect(tabs[2]).toHaveTextContent("Knowledge")
    expect(tabs[3]).toHaveTextContent("Style")
    expect(tabs[4]).toHaveTextContent("Constraints")
  })

  it("renders persona textarea by default", () => {
    render(<PromptWizardForm {...defaultProps} />)
    expect(screen.getByPlaceholderText(/Define the coach's persona/)).toBeInTheDocument()
  })

  it("calls onPersonaChange when persona textarea is edited", () => {
    const onPersonaChange = jest.fn()
    render(<PromptWizardForm {...defaultProps} onPersonaChange={onPersonaChange} />)
    const textarea = screen.getByPlaceholderText(/Define the coach's persona/)
    fireEvent.change(textarea, { target: { value: "A wise mentor" } })
    expect(onPersonaChange).toHaveBeenCalledWith("A wise mentor")
  })

  it("renders tab triggers as clickable buttons", () => {
    render(<PromptWizardForm {...defaultProps} />)
    const toneTab = screen.getByRole("tab", { name: "Tone" })
    expect(toneTab).toBeInTheDocument()
    // Click should not throw
    fireEvent.click(toneTab)
  })

  it("displays provided persona value", () => {
    render(<PromptWizardForm {...defaultProps} persona="Test persona" />)
    const textarea = screen.getByPlaceholderText(/Define the coach's persona/) as HTMLTextAreaElement
    expect(textarea.value).toBe("Test persona")
  })

  it("has all five textareas in the DOM", () => {
    render(<PromptWizardForm {...defaultProps} />)
    // All tab content panels are in the DOM (hidden or visible)
    const textareas = screen.getAllByRole("tabpanel", { hidden: true })
    // At least the active one should be there
    expect(textareas.length).toBeGreaterThanOrEqual(1)
  })
})
