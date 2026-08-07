/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import InterviewFrameForm from "../InterviewFrameForm"

describe("InterviewFrameForm — job description field", () => {
  it("renders an optional job-description textarea", () => {
    render(<InterviewFrameForm onConfirm={jest.fn()} />)

    const field = screen.getByLabelText(/paste the job description/i)
    expect(field).toBeInTheDocument()
    expect(field.tagName).toBe("TEXTAREA")
  })

  it("submits successfully without filling in the job description", async () => {
    const user = userEvent.setup()
    const onConfirm = jest.fn()
    render(<InterviewFrameForm onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText(/^company/i), "Acme Corp")
    await user.type(screen.getByLabelText(/industry/i), "Fintech")
    await user.type(screen.getByLabelText(/role title/i), "VP Engineering")
    await user.type(screen.getByLabelText(/reporting line/i), "CTO")
    await user.type(screen.getByLabelText(/scope of responsibility/i), "40 engineers")

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
    render(<InterviewFrameForm onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText(/^company/i), "Acme Corp")
    await user.type(screen.getByLabelText(/industry/i), "Fintech")
    await user.type(screen.getByLabelText(/role title/i), "VP Engineering")
    await user.type(screen.getByLabelText(/reporting line/i), "CTO")
    await user.type(screen.getByLabelText(/scope of responsibility/i), "40 engineers")
    await user.type(screen.getByLabelText(/paste the job description/i), "Own the platform roadmap")

    await user.click(screen.getByRole("button", { name: /confirm & start the interview/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0][0].jobDescription).toBe("Own the platform roadmap")
  })
})
