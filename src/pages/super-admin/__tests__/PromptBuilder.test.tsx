import { render, screen } from "@testing-library/react"
import PromptBuilder from "../PromptBuilder"
import React from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("@/components/super-admin/prompt-builder/PromptWizardForm", () => ({
  __esModule: true,
  default: () => <div data-testid="prompt-wizard-form" />,
}))
jest.mock("@/components/super-admin/prompt-builder/PromptPreviewPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="prompt-preview-panel" />,
}))
jest.mock("@/components/super-admin/prompt-builder/PromptVersionHistory", () => ({
  __esModule: true,
  default: () => <div data-testid="prompt-version-history" />,
}))

jest.mock("@/hooks/super-admin/coach-management/useCoaches", () => ({
  useCoachesList: () => ({ data: { data: { agents: [] } } }),
}))
jest.mock("@/hooks/prompt-builder/usePromptBuilder", () => ({
  useSavePrompt: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdatePrompt: () => ({ mutateAsync: jest.fn(), isPending: false }),
  usePromptVersions: () => ({ data: { data: { versions: [] } }, isLoading: false }),
}))

describe("PromptBuilder", () => {
  it("renders the page title", () => {
    render(<PromptBuilder />)
    expect(screen.getByText("System Prompt Builder")).toBeInTheDocument()
  })

  it("renders save button", () => {
    render(<PromptBuilder />)
    expect(screen.getByText("Save Prompt")).toBeInTheDocument()
  })

  it("renders the wizard form", () => {
    render(<PromptBuilder />)
    expect(screen.getByTestId("prompt-wizard-form")).toBeInTheDocument()
  })

  it("renders the preview panel", () => {
    render(<PromptBuilder />)
    expect(screen.getByTestId("prompt-preview-panel")).toBeInTheDocument()
  })

  it("save button is disabled when no coach selected", () => {
    render(<PromptBuilder />)
    const saveBtn = screen.getByText("Save Prompt").closest("button")
    expect(saveBtn).toBeDisabled()
  })

  it("wraps content in SuperAdminLayout", () => {
    render(<PromptBuilder />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
