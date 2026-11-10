/**
 * @jest-environment jsdom
 *
 * JF-7 — Favorites. With the server's `job_fit_v2` switch off, nothing renders
 * and nothing is asked. On: the button reflects the server's list and toggles;
 * the list marks the one target and sends every other favorite to the job page,
 * where the existing "Make this my target" path writes goal_targets unchanged.
 * A failed load is an alert, never an empty list.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockEnabled = jest.fn()
const mockList = jest.fn()
const mockSave = jest.fn()
const mockRemove = jest.fn()
jest.mock("@/services/job-fit/savedJobs.service", () => ({
  getSavedJobsEnabled: () => mockEnabled(),
  getSavedJobs: () => mockList(),
  saveJob: (b: unknown) => mockSave(b),
  removeSavedJob: (j: unknown) => mockRemove(j),
}))
const mockTargetsSwitch = jest.fn()
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => mockTargetsSwitch(),
}))
const mockMine = jest.fn()
const mockMakeTarget = jest.fn()
jest.mock("@/services/goals/targets.service", () => ({
  makeTarget: (b: unknown) => mockMakeTarget(b),
  getMyTargets: () => mockMine(),
  getRoadmap: jest.fn(),
  rebuildRoadmap: jest.fn(),
  removeTarget: jest.fn(),
}))

import { FavoriteButton } from "@/pages/job-fit/FavoriteButton"
import { FavoritesList } from "@/pages/job-fit/FavoritesList"

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const ANALYST = { jobId: "j1", roleTitle: "Research Analyst", savedAt: "2026-11-10T00:00:00+00:00" }
const NURSE = { jobId: "j2", roleTitle: "Nurse", savedAt: "2026-11-09T00:00:00+00:00" }

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue([])
  mockMine.mockResolvedValue([])
  mockTargetsSwitch.mockResolvedValue(true)
})

describe("switch OFF", () => {
  beforeEach(() => mockEnabled.mockResolvedValue(false))

  test("the button renders nothing and reads no list", async () => {
    const { container } = renderWith(<FavoriteButton jobId="j1" roleTitle="Research Analyst" />)
    await waitFor(() => expect(mockEnabled).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
    expect(mockList).not.toHaveBeenCalled()
  })

  test("the list renders nothing and reads neither favorites nor targets", async () => {
    const { container } = renderWith(<FavoritesList />)
    await waitFor(() => expect(mockEnabled).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
    expect(mockList).not.toHaveBeenCalled()
    expect(mockMine).not.toHaveBeenCalled()
  })

  test("a failed status read is off", async () => {
    mockEnabled.mockRejectedValue(new Error("boom"))
    const { container } = renderWith(<FavoritesList />)
    await waitFor(() => expect(mockEnabled).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})

describe("FavoriteButton, switch ON", () => {
  beforeEach(() => mockEnabled.mockResolvedValue(true))

  test("saves a job that is not a favorite yet, sending only the job", async () => {
    mockSave.mockResolvedValue({ savedJob: ANALYST, created: true })
    renderWith(<FavoriteButton jobId="j1" roleTitle="Research Analyst" />)
    const btn = await screen.findByRole("button", { name: /save to favorites/i })
    await waitFor(() => expect(btn).toBeEnabled())
    expect(btn).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(btn)
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ jobId: "j1", roleTitle: "Research Analyst" }))
    expect(mockRemove).not.toHaveBeenCalled()
  })

  test("a saved job reads as saved and the click removes it", async () => {
    mockList.mockResolvedValue([ANALYST])
    mockRemove.mockResolvedValue({ jobId: "j1", removed: true })
    renderWith(<FavoriteButton jobId="j1" />)
    const btn = await screen.findByRole("button", { name: /saved to favorites/i })
    expect(btn).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(btn)
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith("j1"))
    expect(mockSave).not.toHaveBeenCalled()
  })

  test("a failed save is said, not swallowed", async () => {
    mockSave.mockRejectedValue({ response: { status: 409, data: {} } })
    renderWith(<FavoriteButton jobId="j1" />)
    const btn = await screen.findByRole("button", { name: /save to favorites/i })
    await waitFor(() => expect(btn).toBeEnabled())
    fireEvent.click(btn)
    expect(await screen.findByRole("alert")).toHaveTextContent(/favorites list is full/i)
  })

  test("the server's own sentence wins", async () => {
    mockSave.mockRejectedValue({ response: { status: 403, data: { detail: "Not switched on yet." } } })
    renderWith(<FavoriteButton jobId="j1" />)
    const btn = await screen.findByRole("button", { name: /save to favorites/i })
    await waitFor(() => expect(btn).toBeEnabled())
    fireEvent.click(btn)
    expect(await screen.findByRole("alert")).toHaveTextContent("Not switched on yet.")
  })

  test("never writes a goal target", async () => {
    mockSave.mockResolvedValue({ savedJob: ANALYST, created: true })
    renderWith(<FavoriteButton jobId="j1" />)
    const btn = await screen.findByRole("button", { name: /save to favorites/i })
    await waitFor(() => expect(btn).toBeEnabled())
    fireEvent.click(btn)
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(mockMakeTarget).not.toHaveBeenCalled()
  })
})

describe("FavoritesList, switch ON", () => {
  beforeEach(() => mockEnabled.mockResolvedValue(true))

  test("an empty list says so", async () => {
    renderWith(<FavoritesList />)
    expect(await screen.findByText(/no favorites yet/i)).toBeInTheDocument()
  })

  test("a failed load is an alert, not an empty list", async () => {
    mockList.mockRejectedValue({ response: { status: 500, data: {} } })
    renderWith(<FavoritesList />)
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load your favorites/i)
    expect(screen.queryByText(/no favorites yet/i)).not.toBeInTheDocument()
  })

  test("marks the one target; the others go to the job page to make it the target", async () => {
    mockList.mockResolvedValue([ANALYST, NURSE])
    mockMine.mockResolvedValue([{ goalId: "g1", jobId: "j2", roleTitle: "Nurse" }])
    renderWith(<FavoritesList />)
    expect(await screen.findByText("Your target")).toBeInTheDocument()
    expect(screen.getAllByText("Your target")).toHaveLength(1)
    expect(screen.getByRole("link", { name: /view roadmap/i })).toHaveAttribute("href", "/my/goals/g1/roadmap")
    const make = screen.getByRole("link", { name: /make research analyst my target/i })
    expect(make).toHaveAttribute("href", "/vertical/job-fit/fit/j1")
    expect(screen.queryByRole("link", { name: /make nurse my target/i })).not.toBeInTheDocument()
    expect(mockMakeTarget).not.toHaveBeenCalled()
  })

  test("with goal targets off it offers no target action and reads no targets", async () => {
    mockTargetsSwitch.mockResolvedValue(false)
    mockList.mockResolvedValue([ANALYST])
    renderWith(<FavoritesList />)
    expect(await screen.findByRole("link", { name: "Research Analyst" })).toBeInTheDocument()
    await waitFor(() => expect(mockTargetsSwitch).toHaveBeenCalled())
    expect(screen.queryByText(/make .* my target/i)).not.toBeInTheDocument()
    expect(mockMine).not.toHaveBeenCalled()
  })

  test("remove deletes that favorite", async () => {
    mockList.mockResolvedValue([ANALYST])
    mockRemove.mockResolvedValue({ jobId: "j1", removed: true })
    renderWith(<FavoritesList />)
    fireEvent.click(await screen.findByRole("button", { name: /remove research analyst/i }))
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith("j1"))
  })

  test("a failed remove is said", async () => {
    mockList.mockResolvedValue([ANALYST])
    mockRemove.mockRejectedValue({ response: { status: 404, data: {} } })
    renderWith(<FavoritesList />)
    fireEvent.click(await screen.findByRole("button", { name: /remove research analyst/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't in your favorites/i)
  })

  test("a favorite with no title still reads as a job", async () => {
    mockList.mockResolvedValue([{ jobId: "j9", roleTitle: null, savedAt: null }])
    renderWith(<FavoritesList />)
    expect(await screen.findByRole("link", { name: "Saved job" })).toHaveAttribute(
      "href",
      "/vertical/job-fit/fit/j9",
    )
  })
})
