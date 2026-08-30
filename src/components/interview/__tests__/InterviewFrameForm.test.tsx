/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import InterviewFrameForm from "../InterviewFrameForm"

// The form reads the employer-pack catalogue, so it needs a query client.
// Stubbed to empty here: these tests cover the frame fields, not the picker
// (see InterviewFrameForm.employerPicker.test.tsx for that).
jest.mock("@/hooks/interview/useEmployerPackCatalogue", () => ({
  useEmployerPackCatalogue: () => ({ data: undefined }),
}))

function renderForm(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^company/i), "Acme Corp")
  await user.type(screen.getByLabelText(/industry/i), "Fintech")
  await user.type(screen.getByLabelText(/role title/i), "VP Engineering")
  await user.type(screen.getByLabelText(/reporting line/i), "CTO")
  await user.type(screen.getByLabelText(/scope of responsibility/i), "40 engineers")
}

describe("InterviewFrameForm — job description field", () => {
  it("renders an optional job-description textarea", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    const field = screen.getByLabelText(/job description/i)
    expect(field).toBeInTheDocument()
    expect(field.tagName).toBe("TEXTAREA")
  })

  it("submits successfully without filling in the job description", async () => {
    const user = userEvent.setup()
    const onConfirm = jest.fn()
    renderForm(<InterviewFrameForm onConfirm={onConfirm} />)

    await fillRequired(user)
    // Intentionally leave the job-description field blank.
    await user.click(screen.getByRole("button", { name: /confirm & start the interview/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    const submitted = onConfirm.mock.calls[0][0]
    expect(submitted.roleTitle).toBe("VP Engineering")
    expect(submitted.jobDescription ?? "").toBe("")
  })

  it("carries a filled-in job description through on submit", async () => {
    const user = userEvent.setup()
    const onConfirm = jest.fn()
    renderForm(<InterviewFrameForm onConfirm={onConfirm} />)

    await fillRequired(user)
    await user.type(screen.getByLabelText(/job description/i), "Own the platform roadmap")
    await user.click(screen.getByRole("button", { name: /confirm & start the interview/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0][0].jobDescription).toBe("Own the platform roadmap")
  })
})

describe("InterviewFrameForm — heading + upload dialog", () => {
  it("shows the default practice heading + submit label", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)
    expect(screen.getByText(/set up your practice interview/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /confirm & start the interview/i }),
    ).toBeInTheDocument()
  })

  it("honors custom title / description / submit label (the live-interview surface)", () => {
    renderForm(<InterviewFrameForm
        onConfirm={jest.fn()}
        title="Set up a live interview"
        description="Confirm the seat you're interviewing for."
        submitLabel="Confirm & start the live interview"
      />,
    )
    expect(screen.getByText(/set up a live interview/i)).toBeInTheDocument()
    expect(screen.queryByText(/set up your practice interview/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /confirm & start the live interview/i }),
    ).toBeInTheDocument()
  })

  it("opens the upload-job-description dialog with a file input", async () => {
    const user = userEvent.setup()
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^upload$/i }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/upload a job description/i)).toBeInTheDocument()
    // A file input is present inside the dialog.
    const fileInput = dialog.querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()
  })
})
