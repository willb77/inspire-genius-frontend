/**
 * The requisition field — package IS-1, finding IS-F1.
 *
 * `requisition_id` / `requisition_label` (migration 031) were written by the
 * backend and never supplied by the frontend: zero hits for "requisition" in
 * src/. Every UI-created session had `requisition_id = NULL`, so the index
 * `ix_interview_session_req_finalized` grouped nothing and UGESP consistency
 * had no key to measure on.
 *
 * The gate is the point of this file. InterviewFrameForm is ALSO the
 * candidate's own practice setup, where there is no opening and no hiring
 * decision — a requisition field there is meaningless at best, and at worst
 * tells a candidate their rehearsal is being filed against a job. It follows
 * the existing `showEmployerPacks` / `showRolePacks` pattern for exactly the
 * same class of reason.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement } from "react"

jest.mock("@/hooks/interview/useEmployerPackCatalogue", () => ({
  useEmployerPackCatalogue: () => ({ data: undefined, isLoading: false }),
}))
jest.mock("@/hooks/interview/useRolePackCatalogue", () => ({
  useRolePackCatalogue: () => ({ data: undefined, isLoading: false }),
}))

import InterviewFrameForm from "../InterviewFrameForm"

function renderForm(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

/** Fill the five required frame fields so submit can succeed. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/company/i), "Acme")
  await user.type(screen.getByLabelText(/industry/i), "Logistics")
  await user.type(screen.getByLabelText(/role title/i), "Regional Manager")
  await user.type(screen.getByLabelText(/reporting line/i), "COO")
  await user.type(screen.getByLabelText(/scope/i), "Three depots")
}

describe("the requisition block is off unless the surface asks for it", () => {
  it("is absent by default — the candidate's practice setup never shows it", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)
    expect(screen.queryByLabelText(/requisition id/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/requisition \/ role opening/i)).not.toBeInTheDocument()
  })

  it("appears when the interviewer-side surface opts in", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} showRequisition />)
    expect(screen.getByLabelText(/requisition id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/opening name/i)).toBeInTheDocument()
  })

  it("explains why it is being asked for, not just what to type", () => {
    // An unexplained ID field gets left blank, and a blank key is exactly the
    // state that made the column useless in the first place.
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} showRequisition />)
    expect(screen.getByText(/compared against the same procedure/i)).toBeInTheDocument()
  })
})

describe("what reaches onConfirm", () => {
  it("carries both requisition values through", async () => {
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    renderForm(<InterviewFrameForm onConfirm={onConfirm} showRequisition />)

    await fillRequired(user)
    await user.type(screen.getByLabelText(/requisition id/i), "REQ-2041")
    await user.type(screen.getByLabelText(/opening name/i), "Regional Manager — North")
    await user.click(screen.getByRole("button", { name: /confirm/i }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        requisitionId: "REQ-2041",
        requisitionLabel: "Regional Manager — North",
      }),
    )
  })

  it("stays optional — the frame confirms with the fields left empty", async () => {
    // It must NOT become a required field by accident: an interviewer running
    // a one-off conversation should not be blocked on inventing a req number.
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    renderForm(<InterviewFrameForm onConfirm={onConfirm} showRequisition />)

    await fillRequired(user)
    await user.click(screen.getByRole("button", { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
