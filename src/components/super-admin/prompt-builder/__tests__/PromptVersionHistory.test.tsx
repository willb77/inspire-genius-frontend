import { render, screen, fireEvent } from "@testing-library/react"
import PromptVersionHistory from "../PromptVersionHistory"
import type { SystemPrompt } from "@/types/prompt-builder"

describe("PromptVersionHistory", () => {
  const mockVersions: SystemPrompt[] = [
    {
      id: "p1",
      coach_id: "c1",
      version: 1,
      persona: "persona1",
      tone: "tone1",
      knowledge_domain: "knowledge1",
      response_style: "style1",
      constraints: "constraints1",
      assembled_prompt: "persona1 tone1 knowledge1 style1 constraints1",
      created_at: "2026-03-01T00:00:00Z",
    },
    {
      id: "p2",
      coach_id: "c1",
      version: 2,
      persona: "persona2",
      tone: "tone2",
      knowledge_domain: "knowledge2",
      response_style: "style2",
      constraints: "constraints2",
      assembled_prompt: "persona2 tone2 knowledge2 style2 constraints2",
      created_at: "2026-03-15T00:00:00Z",
    },
  ]

  it("renders the Version History title", () => {
    render(<PromptVersionHistory versions={mockVersions} onSelectVersion={jest.fn()} />)
    expect(screen.getByText("Version History")).toBeInTheDocument()
  })

  it("renders version buttons", () => {
    render(<PromptVersionHistory versions={mockVersions} onSelectVersion={jest.fn()} />)
    expect(screen.getByText("v1")).toBeInTheDocument()
    expect(screen.getByText("v2")).toBeInTheDocument()
  })

  it("calls onSelectVersion when version clicked", () => {
    const onSelectVersion = jest.fn()
    render(<PromptVersionHistory versions={mockVersions} onSelectVersion={onSelectVersion} />)
    fireEvent.click(screen.getByText("v1"))
    expect(onSelectVersion).toHaveBeenCalledWith(mockVersions[0])
  })

  it("shows loading state", () => {
    render(<PromptVersionHistory versions={[]} isLoading={true} onSelectVersion={jest.fn()} />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("shows empty state when no versions", () => {
    render(<PromptVersionHistory versions={[]} onSelectVersion={jest.fn()} />)
    expect(screen.getByText("No versions yet")).toBeInTheDocument()
  })
})
