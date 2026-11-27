/**
 * @jest-environment jsdom
 *
 * D-18: both forms that call POST /v1/agents/kce/blueprint/generate — the KCE
 * blueprint page and Job Fit's Blueprint Studio — cap the role title and the
 * context at the server's bounds, so a body the form lets through is one the
 * server serves. An uploaded file can fill the context past the cap, so the
 * cap is a validation message as well as a maxLength.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }))
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

const generateMutate = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useGenerateBlueprint", () => ({
  useGenerateBlueprint: () => ({ mutate: generateMutate, isPending: false }),
}))
jest.mock("@/hooks/knowledge-continuity/usePersistBlueprint", () => ({
  usePersistBlueprint: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/job-blueprint", () => ({
  useJobDnaList: () => ({ data: [], isLoading: false }),
}))
jest.mock("@/hooks/knowledge-continuity/useJobDnaSeed", () => ({
  useJobDnaSeed: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/knowledge-continuity/useSavedRoles", () => ({
  useSavedRoles: () => ({ data: [], isLoading: false, isError: false, error: null }),
}))
jest.mock("@/hooks/knowledge-continuity/useSavedRoleBlueprint", () => ({
  useSavedRoleBlueprint: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("@/lib/extractRoleText", () => ({
  ACCEPTED_ROLE_FILE_TYPES: ".txt,.pdf,.docx",
  extractRoleText: jest.fn(),
}))

import KceBlueprintPage from "../KceBlueprintPage"
import BlueprintStudioPage from "@/pages/job-fit/BlueprintStudioPage"
import { KCE_MAX_CONTEXT, KCE_MAX_ROLE_TITLE } from "@/services/knowledge-continuity/llmGuards"

beforeEach(() => jest.clearAllMocks())

const PAGES = [
  ["KceBlueprintPage", KceBlueprintPage],
  ["BlueprintStudioPage", BlueprintStudioPage],
] as const

function fill(roleTitle: string, context: string) {
  fireEvent.change(screen.getByLabelText(/role title/i), { target: { value: roleTitle } })
  fireEvent.change(document.getElementById("context") as HTMLTextAreaElement, {
    target: { value: context },
  })
  fireEvent.click(screen.getByRole("button", { name: /draft the blueprint/i }))
}

describe.each(PAGES)("%s generate form caps", (_name, Page) => {
  test("the title carries the server's bound; the context is not browser-clipped", () => {
    render(<Page />)
    expect(screen.getByLabelText(/role title/i)).toHaveAttribute("maxLength", String(KCE_MAX_ROLE_TITLE))
    expect(document.getElementById("context")).not.toHaveAttribute("maxLength")
  })

  test("a body at the bounds is sent", async () => {
    render(<Page />)
    fill("r".repeat(KCE_MAX_ROLE_TITLE), "c".repeat(KCE_MAX_CONTEXT))
    await waitFor(() => expect(generateMutate).toHaveBeenCalledTimes(1))
  })

  test("a context past the cap (an uploaded file) is refused with a message, not sent", async () => {
    render(<Page />)
    fill("CIO", "c".repeat(KCE_MAX_CONTEXT + 1))
    expect(await screen.findByText(/characters or fewer/i)).toBeInTheDocument()
    expect(generateMutate).not.toHaveBeenCalled()
  })

  test("a role title past the cap is refused with a message, not sent", async () => {
    render(<Page />)
    fill("r".repeat(KCE_MAX_ROLE_TITLE + 1), "")
    expect(await screen.findByText(/keep the role title to 200 characters/i)).toBeInTheDocument()
    expect(generateMutate).not.toHaveBeenCalled()
  })
})

describe.each(PAGES)("%s context paste past the cap (O-CFD18)", (_name, Page) => {
  const over = "c".repeat(KCE_MAX_CONTEXT + 5000)

  test("a 25k paste is kept whole, not clipped by the browser", () => {
    render(<Page />)
    const box = document.getElementById("context") as HTMLTextAreaElement
    expect(box).not.toHaveAttribute("maxLength")
    fireEvent.change(box, { target: { value: over } })
    expect(box.value).toHaveLength(over.length)
  })

  test("the message shows as soon as the text is pasted, before any submit", async () => {
    render(<Page />)
    fireEvent.change(document.getElementById("context") as HTMLTextAreaElement, { target: { value: over } })
    expect(await screen.findByText(/characters or fewer/i)).toBeInTheDocument()
  })

  test("Submit is disabled over the cap and enabled again once it fits", async () => {
    render(<Page />)
    const box = document.getElementById("context") as HTMLTextAreaElement
    const submit = () => screen.getByRole("button", { name: /draft the blueprint/i })
    fireEvent.change(screen.getByLabelText(/role title/i), { target: { value: "CIO" } })
    fireEvent.change(box, { target: { value: over } })
    await waitFor(() => expect(submit()).toBeDisabled())
    fireEvent.click(submit())
    expect(generateMutate).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: "c".repeat(KCE_MAX_CONTEXT) } })
    await waitFor(() => expect(submit()).toBeEnabled())
    expect(screen.queryByText(/characters or fewer/i)).not.toBeInTheDocument()
  })
})
