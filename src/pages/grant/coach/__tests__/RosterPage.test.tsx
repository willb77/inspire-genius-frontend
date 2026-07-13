/**
 * @jest-environment jsdom
 *
 * Coach roster — renders the mock-backed roster with status badges.
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── Mocks ── */
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
// Exercise the coach hooks against the in-memory mock roster, independent of the
// production USE_GRANT_MOCKS flag.
jest.mock("@/hooks/grant/mocks", () => ({
  ...jest.requireActual("@/hooks/grant/mocks"),
  USE_GRANT_MOCKS: true,
}))

import RosterPage from "../RosterPage"

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RosterPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("RosterPage (coach P3)", () => {
  test("renders roster rows with status badges", async () => {
    renderPage()
    expect(screen.getByRole("heading", { name: "My Students" })).toBeInTheDocument()

    // Mock roster resolves — the three sample students appear.
    expect(await screen.findByText("Maria Gonzalez")).toBeInTheDocument()
    expect(screen.getByText("Devon Carter")).toBeInTheDocument()
    expect(screen.getByText("Aisha Patel")).toBeInTheDocument()

    // Status badges render (two managed, one invited).
    expect(screen.getAllByText("Managed").length).toBeGreaterThan(0)
    expect(screen.getByText("Invited")).toBeInTheDocument()

    // Toolbar actions are present.
    expect(screen.getByRole("button", { name: /Add student/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Import CSV/i })).toBeInTheDocument()
  })

  test("filters the roster by name", async () => {
    renderPage()
    await screen.findByText("Maria Gonzalez")

    const search = screen.getByLabelText("Search students")
    fireEvent.change(search, { target: { value: "aisha" } })

    expect(screen.getByText("Aisha Patel")).toBeInTheDocument()
    expect(screen.queryByText("Maria Gonzalez")).not.toBeInTheDocument()
  })
})
