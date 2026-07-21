/**
 * @jest-environment jsdom
 *
 * Honor Administration console — tabs render + cohort create wiring, and the
 * CSV/XLSX import helpers. The admin service is fully mocked (the backend is
 * pre-deploy), so these assert the UI → hook → service contract, not a network.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), warning: jest.fn(), error: jest.fn() },
}))

/* ── Admin service mock ── */
const createCohort = jest.fn()
const listCohorts = jest.fn()
const listCareerAreas = jest.fn()
const listCoaches = jest.fn()
const listFellows = jest.fn()
const assignFellowCoach = jest.fn()
const unassignFellowCoach = jest.fn()

jest.mock("@/services/honor/admin.service", () => ({
  __esModule: true,
  createCohort: (...a: unknown[]) => createCohort(...a),
  listCohorts: (...a: unknown[]) => listCohorts(...a),
  updateCohort: jest.fn(),
  deleteCohort: jest.fn(),
  getCohort: jest.fn(),
  listCareerAreas: (...a: unknown[]) => listCareerAreas(...a),
  createCareerArea: jest.fn(),
  updateCareerArea: jest.fn(),
  deleteCareerArea: jest.fn(),
  listCoaches: (...a: unknown[]) => listCoaches(...a),
  createCoach: jest.fn(),
  importCoaches: jest.fn(),
  deleteCoach: jest.fn(),
  listFellows: (...a: unknown[]) => listFellows(...a),
  updateFellow: jest.fn(),
  deleteFellow: jest.fn(),
  importFellows: jest.fn(),
  assignFellow: jest.fn(),
  unassignFellow: jest.fn(),
  assignCoach: jest.fn(),
  unassignCoach: jest.fn(),
  assignFellowCoach: (...a: unknown[]) => assignFellowCoach(...a),
  unassignFellowCoach: (...a: unknown[]) => unassignFellowCoach(...a),
}))

import HonorAdministration from "../HonorAdministration"
import { parseCsv, matrixToRecords, csvTemplateDataUri } from "../admin/importFile"

function renderConsole() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HonorAdministration />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("HonorAdministration console", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    listCohorts.mockResolvedValue([])
    listCareerAreas.mockResolvedValue([])
    listCoaches.mockResolvedValue([])
    listFellows.mockResolvedValue([])
    createCohort.mockResolvedValue({ id: "c1", name: "Cohort 2026-A" })
  })

  test("renders all four admin tabs", () => {
    renderConsole()
    expect(screen.getByRole("tab", { name: /cohorts/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /coaches/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /fellows/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /career areas/i })).toBeInTheDocument()
    // Header
    expect(screen.getByRole("heading", { name: "Administration" })).toBeInTheDocument()
  })

  test("creating a cohort calls the service with the entered name", async () => {
    const user = userEvent.setup()
    renderConsole()

    await user.type(screen.getByPlaceholderText(/Cohort 2026-A/i), "Cohort 2026-B")
    await user.click(screen.getByRole("button", { name: /create cohort/i }))

    await waitFor(() =>
      expect(createCohort).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Cohort 2026-B" }),
      ),
    )
  })

  test("switching to the Career Areas tab shows its empty state", async () => {
    const user = userEvent.setup()
    renderConsole()
    await user.click(screen.getByRole("tab", { name: /career areas/i }))
    await waitFor(() => expect(screen.getByText(/no career areas yet/i)).toBeInTheDocument())
  })

  test("a failed list query surfaces the graceful 'backend not available' state", async () => {
    listCoaches.mockRejectedValue(new Error("404"))
    const user = userEvent.setup()
    renderConsole()
    await user.click(screen.getByRole("tab", { name: /coaches/i }))
    await waitFor(() =>
      expect(screen.getByText(/Administration backend not available/i)).toBeInTheDocument(),
    )
  })

  test("Fellows tab renders assigned coach chips and assigning a coach calls the service", async () => {
    listFellows.mockResolvedValue([
      {
        id: "f1",
        firstName: "Dana",
        lastName: "Reyes",
        email: "dana@honor.org",
        cohort: "Cohort 2026-A",
        status: "assessed",
        coaches: [{ sub: "coach-1", name: "Alex Coach", email: "alex@honor.org" }],
      },
    ])
    listCoaches.mockResolvedValue([
      { sub: "coach-1", firstName: "Alex", lastName: "Coach", email: "alex@honor.org", role: "coach" },
      { sub: "coach-2", firstName: "Sam", lastName: "Mentor", email: "sam@honor.org", role: "coach" },
    ])
    assignFellowCoach.mockResolvedValue([
      { sub: "coach-1", name: "Alex Coach", email: "alex@honor.org" },
      { sub: "coach-2", name: "Sam Mentor", email: "sam@honor.org" },
    ])

    const user = userEvent.setup()
    renderConsole()
    await user.click(screen.getByRole("tab", { name: /fellows/i }))

    // Already-assigned coach shows as a chip.
    await waitFor(() => expect(screen.getByText("Alex Coach")).toBeInTheDocument())

    // The assign dropdown offers only the not-yet-assigned coach; picking it assigns.
    const select = screen.getByRole("combobox", { name: /assign coach to dana reyes/i })
    await user.selectOptions(select, "coach-2")

    await waitFor(() => expect(assignFellowCoach).toHaveBeenCalledWith("f1", "coach-2"))
  })
})

describe("Honor admin import helpers", () => {
  test("parseCsv handles quoted fields with embedded commas", () => {
    const matrix = parseCsv('first_name,last_name\n"Reyes, Jr.",Marcus\n')
    expect(matrix[1][0]).toBe("Reyes, Jr.")
  })

  test("matrixToRecords maps only the kind's known columns", () => {
    const matrix = parseCsv("first_name,last_name,email,role\nJordan,Morales,j@honor.org,coach\n")
    const rows = matrixToRecords(matrix, "coach")
    expect(rows).toEqual([
      { first_name: "Jordan", last_name: "Morales", email: "j@honor.org", role: "coach" },
    ])
  })

  test("fellow template includes the cohort column", () => {
    const uri = csvTemplateDataUri("fellow")
    expect(decodeURIComponent(uri)).toContain("cohort")
  })
})
