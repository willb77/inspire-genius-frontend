/**
 * @jest-environment jsdom
 *
 * TS-4b — the member's own notice: "your manager or coach viewed your fit for
 * <role>". Through the real hook, with only the HTTP call stubbed.
 *
 *   1. Nobody looked (the normal case), or a backend without the route (404):
 *      nothing is drawn.
 *   2. A failed read is said as one. Silence would read as "nobody looked".
 *   3. Each view names the role and the day, and nothing else from the row.
 *
 * Every role below is invented.
 */
import { act, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const mockViews = jest.fn()
jest.mock("@/services/job-fit/managerViews.service", () => ({
  getManagerFitViews: () => mockViews(),
}))

import { ManagerFitViewsNotice } from "../ManagerFitViewsNotice"

const envelope = (data: unknown) => Promise.resolve({ data: { data } })
const httpError = (status: number) => Promise.reject(Object.assign(new Error(`HTTP ${status}`), { response: { status } }))

async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const view = render(<ManagerFitViewsNotice />, { wrapper })
  await act(async () => {})
  await act(async () => {})
  return view
}

beforeEach(() => mockViews.mockReset())

describe("TS-4b — the member's notice", () => {
  it.each([
    ["nobody looked", () => envelope([])],
    ["a backend without the route (404)", () => httpError(404)],
    ["a response with no list", () => envelope(null)],
  ])("with %s nothing is drawn", async (_name, answer) => {
    mockViews.mockImplementation(answer)
    const { container } = await mount()
    await waitFor(() => expect(mockViews).toHaveBeenCalledTimes(1))
    // Let the answer land; a notice or an alert would be in the tree by now.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    ["a server error", () => httpError(503)],
    ["a refusal", () => httpError(403)],
    ["a network failure", () => Promise.reject(new Error("network down"))],
  ])("%s is said as a failure, not as silence", async (_name, answer) => {
    mockViews.mockImplementation(answer)
    await mount()
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not check whether a manager or coach has viewed your fit for a role.",
    )
    expect(screen.queryByText(/Who viewed your fit/)).toBeNull()
  })

  it("names the role and the day for each view, and nothing else from the row", async () => {
    mockViews.mockImplementation(() =>
      envelope([
        {
          roleTitle: "Invented Role One", jobId: "job-a", viewedAt: "2026-11-24T19:00:00+00:00",
          fitScore: 99, tier: "TIER-SENTINEL", fitBand: "BAND-SENTINEL", viewerSub: "VIEWER-SENTINEL",
        },
        { roleTitle: "Invented Role Two", jobId: "job-b", viewedAt: "not-a-date" },
      ]),
    )
    await mount()
    expect(await screen.findByRole("region", { name: "Who viewed your fit" })).toBeInTheDocument()
    const items = screen.getAllByRole("listitem").map((li) => li.textContent)
    expect(items[0]).toMatch(/^Your manager or coach viewed your fit for Invented Role One on .*2026.*\.$/)
    expect(items[1]).toBe("Your manager or coach viewed your fit for Invented Role Two.")
    expect(screen.getByText(/They see the match score only\. It is not added to your fit reports\./)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/SENTINEL|99/)
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
