import { render, screen } from "@testing-library/react"
import PromptVersionDiff from "../PromptVersionDiff"

describe("PromptVersionDiff", () => {
  it("renders version labels", () => {
    render(
      <PromptVersionDiff
        oldText="Old text"
        newText="New text"
        oldVersion="1"
        newVersion="2"
      />
    )
    expect(screen.getByText("Version 1 (Previous)")).toBeInTheDocument()
    expect(screen.getByText("Version 2 (Current)")).toBeInTheDocument()
  })

  it("renders old and new text", () => {
    render(
      <PromptVersionDiff
        oldText="Old content"
        newText="New content"
        oldVersion="1"
        newVersion="2"
      />
    )
    expect(screen.getByText("Old content")).toBeInTheDocument()
    expect(screen.getByText("New content")).toBeInTheDocument()
  })

  it("shows Empty for empty old text", () => {
    render(
      <PromptVersionDiff
        oldText=""
        newText="New content"
        oldVersion="1"
        newVersion="2"
      />
    )
    expect(screen.getByText("Empty")).toBeInTheDocument()
  })

  it("shows Empty for empty new text", () => {
    render(
      <PromptVersionDiff
        oldText="Old content"
        newText=""
        oldVersion="1"
        newVersion="2"
      />
    )
    // Both empty cases show "Empty"
    const empties = screen.getAllByText("Empty")
    expect(empties.length).toBeGreaterThan(0)
  })

  it("highlights template variables in new text", () => {
    const { container } = render(
      <PromptVersionDiff
        oldText="Old"
        newText="Hello {{name}}"
        oldVersion="1"
        newVersion="2"
      />
    )
    const highlight = container.querySelector(".font-mono")
    expect(highlight?.textContent).toBe("{{name}}")
  })
})
