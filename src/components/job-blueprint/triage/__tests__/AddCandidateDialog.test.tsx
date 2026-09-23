import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { AddCandidateDialog } from "../AddCandidateDialog"
import { describeIntakeError } from "../intakeError"
import * as triageHooks from "@/hooks/job-blueprint/useTriage"
import type { JobDNA } from "@/types/job-blueprint"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/hooks/job-blueprint/useTriage")

const role = (over: Partial<JobDNA>): JobDNA =>
  ({
    id: "bp-1",
    roleTitle: "Machinist",
    department: "Operations",
    status: "active",
    behaviors: [],
    aptitudes: [],
    coreTraits: [],
    ...over,
  }) as unknown as JobDNA

const PUBLISHED = role({})
const DRAFT = role({ id: "bp-draft", roleTitle: "Draft role", status: "draft" })

function mockIntake(mutateAsync: jest.Mock, isPending = false) {
  ;(triageHooks.useSubmitIntake as jest.Mock).mockReturnValue({ mutateAsync, isPending })
}

beforeEach(() => {
  jest.clearAllMocks()
})

test("lists only published roles and submits the intake payload", async () => {
  const user = userEvent.setup()
  const mutateAsync = jest.fn().mockResolvedValue({ id: "c1", code: "MACH-001" })
  mockIntake(mutateAsync)
  const onAdded = jest.fn()

  render(<AddCandidateDialog jobDnas={[PUBLISHED, DRAFT]} defaultJobId="bp-1" onAdded={onAdded} />)
  await user.click(screen.getByRole("button", { name: /add candidate/i }))

  const select = screen.getByLabelText(/Role \(published Job DNA\)/i) as HTMLSelectElement
  expect(Array.from(select.options).map((o) => o.value)).toEqual(["", "bp-1"])
  expect(select.value).toBe("bp-1")

  await user.type(screen.getByLabelText(/full name/i), "Jane Doe")
  await user.type(screen.getByLabelText(/^email/i), "jane@example.com")
  await user.click(screen.getByRole("button", { name: /add to pipeline/i }))

  await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
  expect(mutateAsync).toHaveBeenCalledWith({
    jobId: "bp-1",
    name: "Jane Doe",
    email: "jane@example.com",
    code: undefined,
  })
  expect(toast.success).toHaveBeenCalledWith("Jane Doe added to the pipeline as MACH-001")
  expect(onAdded).toHaveBeenCalledWith({ id: "c1", code: "MACH-001" }, "bp-1")
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
})

test("validates before calling the API", async () => {
  const user = userEvent.setup()
  const mutateAsync = jest.fn()
  mockIntake(mutateAsync)

  render(<AddCandidateDialog jobDnas={[PUBLISHED]} />)
  await user.click(screen.getByRole("button", { name: /add candidate/i }))
  await user.click(screen.getByRole("button", { name: /add to pipeline/i }))

  expect(await screen.findByText("Pick a published role")).toBeInTheDocument()
  expect(screen.getByText("Name is required")).toBeInTheDocument()
  expect(screen.getByText("Enter a valid email address")).toBeInTheDocument()
  expect(mutateAsync).not.toHaveBeenCalled()
})

test("renders a server refusal as an alert and keeps the dialog open", async () => {
  const user = userEvent.setup()
  const mutateAsync = jest.fn().mockRejectedValue({ response: { status: 403, data: { detail: "nope" } } })
  mockIntake(mutateAsync)

  render(<AddCandidateDialog jobDnas={[PUBLISHED]} defaultJobId="bp-1" />)
  await user.click(screen.getByRole("button", { name: /add candidate/i }))
  await user.type(screen.getByLabelText(/full name/i), "Jane Doe")
  await user.type(screen.getByLabelText(/^email/i), "jane@example.com")
  await user.click(screen.getByRole("button", { name: /add to pipeline/i }))

  expect(await screen.findByRole("alert")).toHaveTextContent(/not enabled for Job DNA authoring/i)
  expect(screen.getByRole("dialog")).toBeInTheDocument()
  expect(toast.success).not.toHaveBeenCalled()
})

test("disables submit when no role is published", async () => {
  const user = userEvent.setup()
  mockIntake(jest.fn())
  render(<AddCandidateDialog jobDnas={[DRAFT]} />)
  await user.click(screen.getByRole("button", { name: /add candidate/i }))
  expect(screen.getByText(/No published roles yet/i)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /add to pipeline/i })).toBeDisabled()
})

describe("describeIntakeError", () => {
  test("string detail, list detail (422), 403, and unknown", () => {
    expect(describeIntakeError({ response: { status: 404, data: { detail: "Blueprint not found" } } })).toBe("Blueprint not found")
    expect(
      describeIntakeError({ response: { status: 422, data: { detail: [{ msg: "field required" }, { msg: "value is not a valid email" }] } } })
    ).toBe("field required; value is not a valid email")
    expect(describeIntakeError({ response: { status: 403, data: { detail: "x" } } })).toMatch(/not enabled/)
    expect(describeIntakeError(new Error("boom"))).toMatch(/Could not add/)
  })
})
