import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BroadcastAlert from "../BroadcastAlert"

// Reserved example domain (RFC 2606), built at runtime.
const mockMail = (user: string) => `${user}@example.org`

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/components/super-admin/broadcast/RichHtmlEditor", () => ({ __esModule: true, default: () => null }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { email: mockMail("owner") } }) }))

const mockRemove = jest.fn()
const idle = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false, data: undefined }

jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ isLoading: false, data: { authorized: true, is_owner: true } }),
  useBroadcastAdmins: () => ({
    data: [
      { email: mockMail("owner"), is_owner: true },
      { email: mockMail("helper"), is_owner: false },
    ],
  }),
  useAddBroadcastAdmin: () => idle,
  useRemoveBroadcastAdmin: () => ({ ...idle, mutateAsync: mockRemove }),
  usePreviewAudience: () => idle,
  useSendBroadcast: () => idle,
  useBroadcastHistory: () => ({ data: [] }),
}))

describe("Broadcast alerts access — house style switch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockRemove.mockResolvedValue(undefined)
  })

  it("switch OFF (default): Revoke acts on one click, as today", async () => {
    render(<BroadcastAlert />)
    await userEvent.click(screen.getByRole("button", { name: /Revoke/ }))
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(mockMail("helper")))
    expect(screen.queryByText(/Remove access for/)).not.toBeInTheDocument()
  })

  describe("switch ON", () => {
    beforeEach(() => localStorage.setItem("house_style_admin", "true"))

    it("removing someone's access is confirmed first", async () => {
      render(<BroadcastAlert />)
      expect(screen.queryByRole("button", { name: /^Revoke$/ })).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: /Remove access/ }))
      expect(mockRemove).not.toHaveBeenCalled()
      expect(await screen.findByText(`Remove access for ${mockMail("helper")}?`)).toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
      expect(mockRemove).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole("button", { name: /Remove access/ }))
      const dialogButtons = await screen.findAllByRole("button", { name: "Remove access" })
      await userEvent.click(dialogButtons[dialogButtons.length - 1])
      await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(mockMail("helper")))
    })
  })
})
