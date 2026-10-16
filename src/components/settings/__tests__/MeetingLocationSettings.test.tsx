/**
 * @jest-environment jsdom
 */

/**
 * Default meeting location card (MSCH-2). It must show what is saved, save
 * the trimmed value (or null to clear), refuse what the server would refuse,
 * and say so when a load or save fails rather than looking empty.
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import MeetingLocationSettings from "../MeetingLocationSettings"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockSave = jest.fn()
const mockPrefs: { data?: { defaultLocation: string | null }; error?: unknown; isLoading: boolean } = {
  isLoading: false,
}
jest.mock("@/hooks/manager/useTeamSchedule", () => ({
  useTeamSchedulePreferences: () => mockPrefs,
  useSaveTeamSchedulePreferences: () => ({ mutate: mockSave, isPending: false }),
}))

const LINK = "https://meet.example.test/abc-defg-hij"

beforeEach(() => {
  jest.clearAllMocks()
  mockPrefs.data = { defaultLocation: LINK }
  mockPrefs.error = undefined
  mockPrefs.isLoading = false
})

const field = () => screen.getByLabelText("Default location for sessions you schedule")
const saveButton = () => screen.getByRole("button", { name: "Save" })

it("shows the saved default", () => {
  render(<MeetingLocationSettings />)
  expect(field()).toHaveValue(LINK)
})

it("saves only when changed, and saves the trimmed value", () => {
  render(<MeetingLocationSettings />)
  expect(saveButton()).toBeDisabled()
  fireEvent.change(field(), { target: { value: "  12 Main St, Springfield  " } })
  fireEvent.click(saveButton())
  expect(mockSave).toHaveBeenCalledWith({ defaultLocation: "12 Main St, Springfield" }, expect.anything())
})

it("clears the default by saving null", () => {
  render(<MeetingLocationSettings />)
  fireEvent.change(field(), { target: { value: "   " } })
  fireEvent.click(saveButton())
  expect(mockSave).toHaveBeenCalledWith({ defaultLocation: null }, expect.anything())
})

it("refuses a value longer than the server accepts", () => {
  render(<MeetingLocationSettings />)
  fireEvent.change(field(), { target: { value: "x".repeat(501) } })
  expect(saveButton()).toBeDisabled()
  expect(screen.getByText("At most 500 characters.")).toBeInTheDocument()
})

it("renders the server's reason when a save fails", () => {
  render(<MeetingLocationSettings />)
  fireEvent.change(field(), { target: { value: "Room 4" } })
  fireEvent.click(saveButton())
  const opts = mockSave.mock.calls[0][1]
  act(() => opts.onError({
    isAxiosError: true,
    response: { status: 403, data: { detail: "Scheduling with your team needs a manager role" } },
  }))
  expect(screen.getByRole("alert")).toHaveTextContent("needs a manager role")
})

it("says so when the saved default cannot load", () => {
  mockPrefs.data = undefined
  mockPrefs.error = { isAxiosError: true, response: { status: 500, data: { detail: "boom" } } }
  render(<MeetingLocationSettings />)
  expect(screen.getByRole("alert")).toHaveTextContent("boom")
})
