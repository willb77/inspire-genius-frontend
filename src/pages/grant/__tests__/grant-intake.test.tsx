/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { readyToSearch, triggerProgress, type AidIntakeProfile } from "@/types/grant/intake"

/* ── Mocks ── */
// Keep the singleton axios (and its auth side-effects) out of the test.
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  syncAuthToken: jest.fn(),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

import GrantIntakeFlow from "../intake/GrantIntakeFlow"

function renderFlow() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GrantIntakeFlow />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("GRANT aid-intake trigger logic (mirrors ready_to_search)", () => {
  const full: AidIntakeProfile = {
    student_age: 17,
    enrollment_status: "prospective",
    state_of_residence: "CA",
    institution_type: "four_year",
    household_income_range: "30k_60k",
  }

  test("readyToSearch is false until all five trigger fields are present", () => {
    expect(readyToSearch({})).toBe(false)
    expect(readyToSearch({ student_age: 17 })).toBe(false)
    const missingIncome = { ...full, household_income_range: undefined }
    expect(readyToSearch(missingIncome)).toBe(false)
  })

  test("readyToSearch is true once all five are present", () => {
    expect(readyToSearch(full)).toBe(true)
  })

  test("empty-string values do not count as present", () => {
    expect(readyToSearch({ ...full, state_of_residence: "" })).toBe(false)
  })

  test("triggerProgress counts answered trigger fields", () => {
    expect(triggerProgress({})).toBe(0)
    expect(triggerProgress({ student_age: 17, state_of_residence: "CA" })).toBe(2)
    expect(triggerProgress(full)).toBe(5)
  })
})

describe("GrantIntakeFlow (UI-1)", () => {
  beforeEach(() => jest.clearAllMocks())

  test("opens on the first trigger question with 0/5 essentials", () => {
    renderFlow()
    expect(screen.getByRole("heading", { name: "Build your aid profile" })).toBeInTheDocument()
    expect(screen.getByText("First — how old are you?")).toBeInTheDocument()
    expect(screen.getByText("0/5")).toBeInTheDocument()
  })

  test("answering the age step advances the conversation and progress", async () => {
    renderFlow()
    const ageInput = screen.getByPlaceholderText("e.g. 17")
    fireEvent.change(ageInput, { target: { value: "17" } })
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }))

    // Validation (form.trigger) is async — await the next question rendering.
    expect(await screen.findByText("Where are you in your education journey?")).toBeInTheDocument()
    expect(screen.getByText("1/5")).toBeInTheDocument()
    // The answered step is now an editable transcript chip.
    expect(screen.getByRole("button", { name: /17 years/i })).toBeInTheDocument()
  })

  test("clicking an answered transcript chip jumps back to edit that step", async () => {
    renderFlow()
    fireEvent.change(screen.getByPlaceholderText("e.g. 17"), { target: { value: "17" } })
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    // On step 2 now; click the age chip to edit it.
    const chip = await screen.findByRole("button", { name: /17 years/i })
    fireEvent.click(chip)
    // Back on the age question, value preserved.
    expect(await screen.findByText("First — how old are you?")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("e.g. 17")).toHaveValue(17)
  })

  test("Back returns to the previous step", async () => {
    renderFlow()
    fireEvent.change(screen.getByPlaceholderText("e.g. 17"), { target: { value: "20" } })
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    fireEvent.click(await screen.findByRole("button", { name: /Back/i }))
    expect(await screen.findByText("First — how old are you?")).toBeInTheDocument()
  })

  test("blocks advancing past a required step with an invalid value", async () => {
    renderFlow()
    const ageInput = screen.getByPlaceholderText("e.g. 17")
    fireEvent.change(ageInput, { target: { value: "3" } }) // below min
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }))

    // The validation error surfaces and we do NOT advance to the next question.
    expect(await screen.findByText("Age looks too low")).toBeInTheDocument()
    expect(
      screen.queryByText("Where are you in your education journey?")
    ).not.toBeInTheDocument()
    expect(screen.getByText("First — how old are you?")).toBeInTheDocument()
  })
})
