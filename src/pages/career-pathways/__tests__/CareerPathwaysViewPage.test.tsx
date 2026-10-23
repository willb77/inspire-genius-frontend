/**
 * @jest-environment jsdom
 *
 * N-8 — the recipient's view. Public, the token from the URL fragment, a code
 * mailed at the moment of opening; every refusal of the link reads the same.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { OpenedProfile } from "@/types/careerPathways"

const svc = { requestCode: jest.fn(), openShared: jest.fn(), downloadShared: jest.fn() }
jest.mock("@/services/career-pathways/careerPathways.service", () => ({
  requestCode: (t: unknown) => svc.requestCode(t),
  openShared: (t: unknown, c: unknown) => svc.openShared(t, c),
  downloadShared: (t: unknown, k: unknown, f: unknown) => svc.downloadShared(t, k, f),
}))

import CareerPathwaysViewPage from "../CareerPathwaysViewPage"

const OPENED: OpenedProfile = {
  organisation: "Example Programme",
  expiresAt: "2026-11-06T00:00:00+00:00",
  allowDownload: true,
  viewKey: "vk",
  profile: {
    sections: {
      identity: { available: true, name: "Casey Candidate" },
      fit: { available: true, roles: [], validatedRoles: 0, note: "No role you can see has a validated benchmark yet." },
      practice: { available: true, sessions: 2, latestAt: "2026-10-20T00:00:00Z", latestBand: "good-alignment",
        byGoal: [], note: "Practice only." },
    },
  },
}

function renderAt(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <CareerPathwaysViewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => jest.clearAllMocks())

test("no token: the link is not available, nothing is called", () => {
  renderAt("/career-pathways/view")
  expect(screen.getByRole("alert")).toHaveTextContent("This link is not available")
  expect(svc.requestCode).not.toHaveBeenCalled()
})

test("code then open shows the frozen profile, the honest empty fit, and download", async () => {
  svc.requestCode.mockResolvedValue(undefined)
  svc.openShared.mockResolvedValue(OPENED)
  renderAt("/career-pathways/view#tok123")
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }))
  await waitFor(() => expect(svc.requestCode).toHaveBeenCalledWith("tok123"))
  await userEvent.type(await screen.findByLabelText("Code"), "12a3456")
  await userEvent.click(screen.getByRole("button", { name: "Open" }))
  await waitFor(() => expect(svc.openShared).toHaveBeenCalledWith("tok123", "123456"))
  expect(await screen.findByText("Casey Candidate")).toBeInTheDocument()
  expect(screen.getByTestId("fit-empty")).toHaveTextContent("validated benchmark")
  expect(screen.getByText(/2 practice interviews/)).toHaveTextContent("Good alignment")

  const url = jest.fn(() => "blob:x")
  const revoke = jest.fn()
  Object.assign(URL, { createObjectURL: url, revokeObjectURL: revoke })
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
  svc.downloadShared.mockResolvedValue(new Blob(["%PDF"]))
  await userEvent.click(screen.getByRole("button", { name: "Download PDF" }))
  await waitFor(() => expect(svc.downloadShared).toHaveBeenCalledWith("tok123", "vk", "pdf"))
  await waitFor(() => expect(click).toHaveBeenCalled())
  click.mockRestore()
})

test("a refused link reads the same as any other refusal", async () => {
  svc.requestCode.mockRejectedValue({ response: { status: 404, data: { detail: "This link is not available." } } })
  renderAt("/career-pathways/view#gone")
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("may have expired, been withdrawn")
})

test("a wrong code says so", async () => {
  svc.requestCode.mockResolvedValue(undefined)
  svc.openShared.mockRejectedValue({ response: { status: 403, data: { detail: "That code is not right." } } })
  renderAt("/career-pathways/view#tok")
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }))
  await userEvent.type(await screen.findByLabelText("Code"), "000000")
  await userEvent.click(screen.getByRole("button", { name: "Open" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("That code is not right.")
})

test("no download offered when the candidate did not allow it", async () => {
  svc.requestCode.mockResolvedValue(undefined)
  svc.openShared.mockResolvedValue({ ...OPENED, allowDownload: false, viewKey: null })
  renderAt("/career-pathways/view#tok")
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }))
  await userEvent.type(await screen.findByLabelText("Code"), "111111")
  await userEvent.click(screen.getByRole("button", { name: "Open" }))
  expect(await screen.findByText("Casey Candidate")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Download/ })).not.toBeInTheDocument()
})
