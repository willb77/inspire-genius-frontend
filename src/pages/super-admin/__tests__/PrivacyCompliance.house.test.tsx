import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import PrivacyCompliance from "../PrivacyCompliance"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockMutate = jest.fn()
const mockMutateAsync = jest.fn()
const mockRefetch = jest.fn()
let mockRequests: { data?: { requests: unknown[] }; isPending: boolean; isError: boolean }

jest.mock("@/hooks/privacy/usePrivacy", () => ({
  useDeletionRequests: () => ({ ...mockRequests, refetch: mockRefetch }),
  useDeletionManifest: () => ({ data: undefined, isPending: false }),
  useRetentionSweep: () => ({ mutate: mockMutate, mutateAsync: mockMutateAsync, isPending: false }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyCompliance />
    </MemoryRouter>,
  )
}

describe("Privacy page — house style switch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockRequests = { data: { requests: [] }, isPending: false, isError: false }
    mockMutateAsync.mockResolvedValue({ message: "Swept" })
  })

  it("switch OFF (default): today's header, and the sweep runs on one click", async () => {
    renderPage()
    expect(screen.getByText("Privacy & RTBF Compliance")).toBeInTheDocument()
    expect(screen.getByText("No RTBF deletion requests found.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Run Retention Sweep/ }))
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Delete expired data?")).not.toBeInTheDocument()
  })

  describe("switch ON", () => {
    beforeEach(() => localStorage.setItem("house_style_admin", "true"))

    it("uses the plain page title and no engineering header", () => {
      renderPage()
      expect(screen.getByRole("heading", { level: 1, name: "Data deletion requests" })).toBeInTheDocument()
      expect(screen.queryByText("Privacy & RTBF Compliance")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Run Retention Sweep/ })).not.toBeInTheDocument()
    })

    it("the sweep deletes nothing until the person confirms", async () => {
      renderPage()
      await userEvent.click(screen.getByRole("button", { name: /Delete expired data…/ }))
      expect(mockMutate).not.toHaveBeenCalled()
      expect(mockMutateAsync).not.toHaveBeenCalled()
      expect(await screen.findByText("Delete expired data?")).toBeInTheDocument()
      expect(screen.getByText("This can't be undone.")).toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
      expect(mockMutateAsync).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole("button", { name: /Delete expired data…/ }))
      await userEvent.click(await screen.findByRole("button", { name: "Delete" }))
      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1))
      expect(mockMutate).not.toHaveBeenCalled()
      await waitFor(() => expect(mockRefetch).toHaveBeenCalled())
    })

    it("a failed sweep says so in plain words", async () => {
      const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } }
      mockMutateAsync.mockRejectedValueOnce(new Error("boom"))
      renderPage()
      await userEvent.click(screen.getByRole("button", { name: /Delete expired data…/ }))
      await userEvent.click(await screen.findByRole("button", { name: "Delete" }))
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("We couldn't delete expired data. Try again."))
    })

    it("a failed load shows the error state, not an empty list", () => {
      mockRequests = { data: undefined, isPending: false, isError: true }
      renderPage()
      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load data deletion requests.")
      expect(screen.queryByText("No data deletion requests yet")).not.toBeInTheDocument()
      expect(screen.queryByText("No RTBF deletion requests found.")).not.toBeInTheDocument()
    })

    it("an empty list says so in plain words", () => {
      renderPage()
      expect(screen.getByText("No data deletion requests yet")).toBeInTheDocument()
    })
  })
})
