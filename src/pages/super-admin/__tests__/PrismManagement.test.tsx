import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import "@testing-library/jest-dom"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import PrismManagement from "../PrismManagement"

// ── Layout & UI mocks ────────────────────────────────────────────────
type Children = { children?: React.ReactNode }
type AnyProps = Children & { [key: string]: unknown }

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: Children) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// Slider — emit a button that bumps the value so we can assert state changes.
jest.mock("@/components/ui/slider", () => ({
  Slider: ({
    id,
    value,
    onValueChange,
  }: {
    id?: string
    value?: number[]
    onValueChange?: (v: number[]) => void
  }) => (
    <button
      data-testid={`slider-${id ?? "x"}`}
      type="button"
      onClick={() =>
        onValueChange?.([Math.min(100, (value?.[0] ?? 0) + 10)])
      }
    >
      slider-{id} value={value?.[0] ?? 0}
    </button>
  ),
}))

// AlertDialog — render content inline so the destructive action is testable.
jest.mock("@/components/ui/alert-dialog", () => {
  const Pass = ({ children }: Children) => <>{children}</>
  return {
    AlertDialog: ({ open, children }: AnyProps & { open?: boolean }) =>
      open ? <div data-testid="alert-dialog">{children}</div> : null,
    AlertDialogContent: Pass,
    AlertDialogHeader: Pass,
    AlertDialogFooter: Pass,
    AlertDialogTitle: ({ children }: Children) => <h2>{children}</h2>,
    AlertDialogDescription: ({ children }: Children) => <p>{children}</p>,
    AlertDialogCancel: ({ children, ...rest }: AnyProps) => (
      <button {...(rest as Record<string, unknown>)}>{children}</button>
    ),
    AlertDialogAction: ({ children, onClick, disabled }: AnyProps & {
      onClick?: (e: React.MouseEvent) => void
      disabled?: boolean
    }) => (
      <button
        data-testid="alert-dialog-confirm"
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    ),
  }
})

// Dialog — render content inline when open.
jest.mock("@/components/ui/dialog", () => {
  const Pass = ({ children }: Children) => <>{children}</>
  return {
    Dialog: ({ open, children }: AnyProps & { open?: boolean }) =>
      open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: Pass,
    DialogHeader: Pass,
    DialogFooter: Pass,
    DialogTitle: ({ children }: Children) => <h2>{children}</h2>,
  }
})

// ── Hook mocks ──────────────────────────────────────────────────────
const createMutate = jest.fn()
const updateMutate = jest.fn()
const deleteMutate = jest.fn()
const usePrismListSpy = jest.fn()

const FIXTURE_ROWS = [
  {
    id: "row-aaa",
    user_id: "user-1@test.com",
    gold: 60,
    green: 30,
    blue: 50,
    orange: 80,
    version: "v1",
    assessed_at: "2026-05-12T10:00:00Z",
    created_at: "2026-05-12T10:00:00Z",
    updated_at: null,
  },
  {
    id: "row-bbb",
    user_id: "user-2@test.com",
    gold: 25,
    green: 45,
    blue: 65,
    orange: 85,
    version: "v1",
    assessed_at: "2026-05-11T10:00:00Z",
    created_at: "2026-05-11T10:00:00Z",
    updated_at: null,
  },
]

jest.mock("@/hooks/super-admin/prism/usePrism", () => ({
  usePrismList: (params: unknown) => {
    usePrismListSpy(params)
    return {
      data: { rows: FIXTURE_ROWS, total: FIXTURE_ROWS.length },
      isLoading: false,
    }
  },
  useCreatePrism: () => ({ mutate: createMutate, isPending: false }),
  useUpdatePrism: () => ({ mutate: updateMutate, isPending: false }),
  useDeletePrism: () => ({ mutate: deleteMutate, isPending: false }),
}))

// useAuth — return super-admin role by default; overrideable per test.
const hasRoleSpy = jest.fn((role: string) => role === "super-admin")
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: (r: string) => hasRoleSpy(r) }),
}))

// ── Helpers ─────────────────────────────────────────────────────────
function renderPage(initialUrl = "/super-admin/prism-management") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route
            path="/super-admin/prism-management"
            element={<PrismManagement />}
          />
          <Route path="/home" element={<div>HOME_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// ── Tests ───────────────────────────────────────────────────────────
describe("PrismManagement", () => {
  beforeEach(() => {
    createMutate.mockClear()
    updateMutate.mockClear()
    deleteMutate.mockClear()
    usePrismListSpy.mockClear()
    hasRoleSpy.mockImplementation((role: string) => role === "super-admin")
  })

  it("renders rows from mocked data", () => {
    renderPage()
    expect(screen.getByTestId("prism-row-row-aaa")).toBeInTheDocument()
    expect(screen.getByTestId("prism-row-row-bbb")).toBeInTheDocument()
    expect(screen.getByText("user-1@test.com")).toBeInTheDocument()
    expect(screen.getByText("user-2@test.com")).toBeInTheDocument()
  })

  it("typing in the search box re-issues the list query with a search param", () => {
    renderPage()
    const input = screen.getByLabelText("Search PRISM rows by user_id")
    fireEvent.change(input, { target: { value: "user-1" } })
    const lastCall =
      usePrismListSpy.mock.calls[usePrismListSpy.mock.calls.length - 1][0]
    expect(lastCall).toMatchObject({ search: "user-1" })
  })

  it("opens the edit dialog when the row Edit button is clicked", () => {
    renderPage()
    fireEvent.click(
      screen.getByLabelText("Edit PRISM row for user-1@test.com"),
    )
    const dialog = screen.getByTestId("dialog")
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText("user-1@test.com")).toBeInTheDocument()
    // Edit dialog has 4 sliders
    expect(within(dialog).getAllByTestId(/^slider-edit-prism-/)).toHaveLength(4)
  })

  it("slider interaction updates the displayed score value", () => {
    renderPage()
    fireEvent.click(
      screen.getByLabelText("Edit PRISM row for user-1@test.com"),
    )
    const dialog = screen.getByTestId("dialog")
    const goldValueBefore = within(dialog)
      .getByTestId("score-edit-prism-gold-value")
      .textContent
    expect(goldValueBefore).toBe("60")
    fireEvent.click(within(dialog).getByTestId("slider-edit-prism-gold"))
    expect(
      within(dialog).getByTestId("score-edit-prism-gold-value").textContent,
    ).toBe("70")
  })

  it("Save changes calls the update mutation with the current scores", () => {
    renderPage()
    fireEvent.click(
      screen.getByLabelText("Edit PRISM row for user-1@test.com"),
    )
    const dialog = screen.getByTestId("dialog")
    fireEvent.click(within(dialog).getByText("Save changes"))
    expect(updateMutate).toHaveBeenCalledTimes(1)
    expect(updateMutate.mock.calls[0][0]).toMatchObject({
      id: "row-aaa",
      body: { gold: 60, green: 30, blue: 50, orange: 80 },
    })
  })

  it("delete confirm fires the delete mutation", () => {
    renderPage()
    fireEvent.click(
      screen.getByLabelText("Delete PRISM row for user-1@test.com"),
    )
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("alert-dialog-confirm"))
    expect(deleteMutate).toHaveBeenCalledTimes(1)
    expect(deleteMutate.mock.calls[0][0]).toBe("row-aaa")
  })

  it("clicking 'New PRISM Row' opens the create dialog", () => {
    renderPage()
    fireEvent.click(screen.getByText("New PRISM Row"))
    const dialog = screen.getByTestId("dialog")
    expect(within(dialog).getByText("Create PRISM Row")).toBeInTheDocument()
    expect(within(dialog).getAllByTestId(/^slider-prism-/)).toHaveLength(4)
  })

  it("Create with a user_id calls the create mutation", () => {
    renderPage()
    fireEvent.click(screen.getByText("New PRISM Row"))
    const dialog = screen.getByTestId("dialog")
    fireEvent.change(within(dialog).getByLabelText("User ID"), {
      target: { value: "new-user@test.com" },
    })
    fireEvent.click(within(dialog).getByText("Create"))
    expect(createMutate).toHaveBeenCalledTimes(1)
    expect(createMutate.mock.calls[0][0]).toMatchObject({
      user_id: "new-user@test.com",
      gold: 50,
      green: 50,
      blue: 50,
      orange: 50,
    })
  })

  it("redirects non-super-admin users away from the page", () => {
    hasRoleSpy.mockImplementation(() => false)
    renderPage()
    expect(screen.getByText("HOME_PAGE")).toBeInTheDocument()
    expect(screen.queryByText("PRISM Management")).not.toBeInTheDocument()
  })
})
