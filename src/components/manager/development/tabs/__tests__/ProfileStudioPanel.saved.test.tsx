/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import type { BehavioralProfile, PrismDimension } from "@/types/development"

/**
 * Keeping, listing and re-opening a write-up (TDS-3).
 *
 * A separate file from `ProfileStudioPanel.test.tsx`, which owns the ORDER of
 * the panel's refusals and asserts nothing about a store. Nothing is added
 * there beyond the query client the store now needs.
 *
 * The saved list sits BELOW the refusals on purpose, and one of these tests is
 * about that: when the member has not shared their PRISM (TDS-1b), a write-up
 * kept while the grant was live must not be readable. A kept document is the
 * sharpest case for that grant — prose about a named colleague's psychology,
 * exportable to a PDF that outlives the tab.
 *
 * Invented people — this repo is public.
 */

const mockRun = jest.fn()
jest.mock("@/hooks/useTeamStudio", () => ({
  ...jest.requireActual("@/hooks/useTeamStudio"),
  useSubjectNarrative: () => ({ run: mockRun, pending: false }),
}))

jest.mock("@/hooks/manager/development/useMemberFullPrism", () => ({
  useMemberFullPrism: () => ({ data: null, isLoading: false }),
}))

// The export buttons are a probe: they build the doc on click so the test can
// read what the PDF would carry without touching jsPDF.
const builtDocs: { notice?: string; sections?: { body?: string }[] }[] = []
jest.mock("@/components/prism/narrative/NarrativeExportButtons", () => ({
  __esModule: true,
  default: ({ build }: { build: () => unknown }) => (
    <button type="button" onClick={() => builtDocs.push(build() as never)}>
      Export write-up
    </button>
  ),
}))

// react-markdown is ESM-only and jest's CJS runtime cannot parse it.
jest.mock("@/components/prism/narrative/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div data-testid="write-up">{text}</div>,
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}))
import { toast } from "sonner"

const post = jest.fn()
const get = jest.fn()
const del = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, get, delete: del }) }))

import { ProfileStudioPanel } from "../ProfileStudioPanel"
import { SAVED_ANALYSIS_COPY } from "@/constants/development"

const prism: PrismDimension[] = [
  { id: 1, label: "Innovating", score: 80, quadrant: 1 },
  { id: 2, label: "Initiating", score: 65, quadrant: 1 },
  { id: 3, label: "Supporting", score: 55, quadrant: 3 },
  { id: 4, label: "Coordinating", score: 70, quadrant: 3 },
]
const profile: BehavioralProfile = { prism } as BehavioralProfile

function keptRow(over: Record<string, unknown> = {}) {
  return {
    id: "a-1",
    memberId: "m-1",
    kind: "analyse",
    title: "Dana Whitfield — behavioural write-up",
    content: "## Where they lead\n\nThey plan before moving.",
    inputs: { subjectIds: ["m-1"], subjectNames: ["Dana Whitfield"], notice: "Server notice." },
    createdAt: "2026-09-20T10:00:00Z",
    ...over,
  }
}

function renderPanel(over: { notShared?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ProfileStudioPanel
        memberId="m-1"
        memberName="Dana Whitfield"
        profile={profile}
        notShared={over.notShared}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  builtDocs.length = 0
  post.mockReset().mockResolvedValue({ data: { data: keptRow() } })
  get.mockReset().mockResolvedValue({ data: { data: { analyses: [] } } })
  del.mockReset().mockResolvedValue({ data: { data: { deleted: true } } })
  mockRun.mockResolvedValue({ text: "fresh write-up", notice: "Server notice.", failed: 0, parts: 1 })
})

describe("ProfileStudioPanel — keeping a write-up", () => {
  it("offers nothing to keep until there is a write-up on screen", async () => {
    renderPanel()
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(
      screen.queryByRole("button", { name: SAVED_ANALYSIS_COPY.keepWriteUp }),
    ).not.toBeInTheDocument()
  })

  it("keeps the text that is on screen, under this member, named after them", async () => {
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Write it up" }))
    await waitFor(() =>
      expect(screen.getByTestId("write-up")).toHaveTextContent("fresh write-up"),
    )

    fireEvent.click(screen.getByRole("button", { name: SAVED_ANALYSIS_COPY.keepWriteUp }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith("/v1/growth/members/m-1/analyses", {
      kind: "analyse",
      title: "Dana Whitfield — behavioural write-up",
      content: "fresh write-up",
      inputs: {
        subjectIds: ["m-1"],
        // The name AS IT WAS, so a kept write-up still reads correctly after a
        // rename or after the person leaves the team.
        subjectNames: ["Dana Whitfield"],
        notice: "Server notice.",
      },
    })
    expect(toast.success).toHaveBeenCalledWith(SAVED_ANALYSIS_COPY.saved)
  })

  it("a failed save says so rather than reporting success", async () => {
    post.mockRejectedValue(new Error("nope"))
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Write it up" }))
    await waitFor(() => expect(screen.getByTestId("write-up")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: SAVED_ANALYSIS_COPY.keepWriteUp }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe("ProfileStudioPanel — the kept list", () => {
  it("an empty list says it is empty; a FAILED list says it failed", async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByText(SAVED_ANALYSIS_COPY.empty)).toBeInTheDocument())
    expect(screen.queryByText(SAVED_ANALYSIS_COPY.loadError)).not.toBeInTheDocument()
  })

  it("a load failure is not an empty list", async () => {
    get.mockRejectedValue(new Error("boom"))
    renderPanel()
    await waitFor(() =>
      expect(screen.getByText(SAVED_ANALYSIS_COPY.loadError)).toBeInTheDocument(),
    )
    // The failure mode: a read that failed telling a manager their saved work
    // is gone.
    expect(screen.queryByText(SAVED_ANALYSIS_COPY.empty)).not.toBeInTheDocument()
  })

  it("says the kept work is private to this manager and stays with this member", async () => {
    renderPanel()
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.getByText(new RegExp(SAVED_ANALYSIS_COPY.privateToYou.slice(0, 40)))).toBeInTheDocument()
    expect(screen.getByText(/Kept in Dana Whitfield's workspace/)).toBeInTheDocument()
  })

  it("re-opening puts the KEPT document on screen, and the export follows it", async () => {
    get.mockResolvedValue({ data: { data: { analyses: [keptRow()] } } })
    renderPanel()
    const open = await screen.findByRole("button", {
      name: `${SAVED_ANALYSIS_COPY.open}: Dana Whitfield — behavioural write-up`,
    })

    // Generate something DIFFERENT first, so re-opening cannot pass by accident.
    fireEvent.click(screen.getByRole("button", { name: "Write it up" }))
    await waitFor(() => expect(screen.getByTestId("write-up")).toHaveTextContent("fresh write-up"))

    fireEvent.click(open)
    await waitFor(() =>
      expect(screen.getByTestId("write-up")).toHaveTextContent("They plan before moving."),
    )
    // And the export now builds from the kept text, not from the last generation.
    fireEvent.click(screen.getByRole("button", { name: "Export write-up" }))
    expect(builtDocs[0]?.sections?.[0]?.body).toContain("They plan before moving.")
    expect(builtDocs[0]?.notice).toBe("Server notice.")
  })

  it("deleting one says so, and never reports it as a permission problem", async () => {
    get.mockResolvedValue({ data: { data: { analyses: [keptRow()] } } })
    del.mockResolvedValue({ data: { data: { deleted: false } } })
    renderPanel()
    const row = await screen.findByRole("button", {
      name: "Delete Dana Whitfield — behavioural write-up",
    })
    fireEvent.click(row)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    // The server answers 404 for "no such analysis" AND for "not yours",
    // indistinguishably and on purpose. Whatever wording reaches the toast —
    // the hook's own sentence or the panel's fallback — must not separate them.
    const said = String((toast.error as jest.Mock).mock.calls[0][0])
    expect(said).not.toMatch(/permission|allowed|another|other manager|forbidden|403/i)
    expect(SAVED_ANALYSIS_COPY.deleteFailed).not.toMatch(
      /permission|allowed|another|forbidden/i,
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("lists the date and the names the run carried", async () => {
    get.mockResolvedValue({ data: { data: { analyses: [keptRow()] } } })
    renderPanel()
    const item = (await screen.findByText("Dana Whitfield — behavioural write-up")).closest("li")
    expect(item).not.toBeNull()
    // Names as they were at the time plus the date, on the row's second line.
    expect(
      within(item as HTMLElement).getByText(
        (_, el) =>
          el?.tagName === "P" &&
          /Dana Whitfield/.test(el.textContent ?? "") &&
          /2026/.test(el.textContent ?? ""),
      ),
    ).toBeInTheDocument()
  })
})

describe("ProfileStudioPanel — TDS-1b still wins over the kept list", () => {
  /**
   * A write-up kept while the grant was live must not be readable after the
   * member stops sharing. The refusal returns BEFORE the saved card renders, so
   * there is no window in which a kept document about a withheld profile is on
   * screen.
   *
   * MEASURED, so nobody reads more into this than it says: the list is still
   * REQUESTED. `useSavedRuns` is a hook and runs before any branch can return,
   * so the fetch happens and its response is simply never rendered. That is not
   * a disclosure — the rows are this manager's own, and the server would serve
   * them to this caller regardless — but it does mean the redaction here is a
   * render guard, not a fetch guard.
   */
  it("a withheld profile renders none of the kept write-ups", async () => {
    get.mockResolvedValue({ data: { data: { analyses: [keptRow()] } } })
    renderPanel({ notShared: true })
    expect(screen.getByTestId("studio-state-not-shared")).toBeInTheDocument()
    expect(screen.queryByText(SAVED_ANALYSIS_COPY.writeUpHeading)).not.toBeInTheDocument()
    expect(
      screen.queryByText("Dana Whitfield — behavioural write-up"),
    ).not.toBeInTheDocument()
  })
})
