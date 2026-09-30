/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import type { ComparePort, CompareCopy, SubjectListPort } from "@/components/prism/studio/ports"

/**
 * Keeping, listing and re-opening a comparison (TDS-3).
 *
 * The store is wired on THIS side rather than inside ComparePanel, which is
 * shared with the super-admin Character Lab and must stay unable to reach a
 * manager surface's rows. What ComparePanel gained is one optional render slot
 * for the document it is holding; everything that decides what may be done with
 * that document is here. So this file drives the slot the way the real panel
 * does, and `src/components/prism/studio/__tests__/isolation.test.ts` still
 * holds the other half of that argument.
 *
 * Invented people — this repo is public.
 */

const castPort: SubjectListPort = { subjects: [], isLoading: false }
jest.mock("@/hooks/manager/development/useStudioCast", () => ({
  useStudioCast: () => ({ port: castPort, resolve: jest.fn(), withoutPrism: 0 }),
}))

// The shared panel is a probe. It renders whatever the slot returns, with the
// document it would have been holding — which is what the real panel does.
let slotCtx = { names: ["Dana Whitfield", "Rowan Escobar"], comparison: "## Friction and fit", notice: "Server notice." }
const received: { hasSlot?: boolean } = {}
jest.mock("@/components/prism/studio/ComparePanel", () => ({
  __esModule: true,
  default: ({
    comparisonActions,
  }: {
    port: ComparePort
    copy: CompareCopy
    comparisonActions?: (ctx: {
      names: string[]
      comparison: string
      notice: string
    }) => React.ReactNode
  }) => {
    received.hasSlot = Boolean(comparisonActions)
    return <div data-testid="compare-panel">{comparisonActions?.(slotCtx)}</div>
  },
}))

jest.mock("@/components/prism/narrative/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div data-testid="opened-doc">{text}</div>,
}))

const builtDocs: { notice?: string; sections?: { body?: string }[]; title?: string }[] = []
jest.mock("@/components/prism/narrative/NarrativeExportButtons", () => ({
  __esModule: true,
  default: ({ build }: { build: () => unknown }) => (
    <button type="button" onClick={() => builtDocs.push(build() as never)}>
      Export comparison
    </button>
  ),
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))
import { toast } from "sonner"

const post = jest.fn()
const get = jest.fn()
const del = jest.fn()
jest.mock("@/lib/agentApi", () => ({ getApi: () => ({ post, get, delete: del }) }))

import { TeamComparePanel } from "../TeamComparePanel"
import { SAVED_ANALYSIS_COPY } from "@/constants/development"
import { TEAM_STUDIO_COMPARE_COPY } from "../studioCopy"

function keptRow(over: Record<string, unknown> = {}) {
  return {
    id: "a-1",
    memberId: "m-1",
    kind: "compare",
    title: "Dana Whitfield vs Rowan Escobar",
    content: "## Where they diverge\n\nOne plans, one moves.",
    inputs: {
      subjectIds: [],
      subjectNames: ["Dana Whitfield", "Rowan Escobar"],
      notice: "Kept notice.",
    },
    createdAt: "2026-09-20T10:00:00Z",
    ...over,
  }
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TeamComparePanel memberId="m-1" memberName="Dana Whitfield" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  builtDocs.length = 0
  received.hasSlot = undefined
  slotCtx = {
    names: ["Dana Whitfield", "Rowan Escobar"],
    comparison: "## Friction and fit",
    notice: "Server notice.",
  }
  post.mockReset().mockResolvedValue({ data: { data: keptRow() } })
  get.mockReset().mockResolvedValue({ data: { data: { analyses: [] } } })
  del.mockReset().mockResolvedValue({ data: { data: { deleted: true } } })
})

describe("TeamComparePanel — keeping a comparison", () => {
  it("passes a keep control into the shared panel's slot", async () => {
    renderPanel()
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(received.hasSlot).toBe(true)
    expect(
      screen.getByRole("button", { name: SAVED_ANALYSIS_COPY.keepComparison }),
    ).toBeInTheDocument()
  })

  it("keeps the document the panel was holding, under this member (D-TDS3)", async () => {
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: SAVED_ANALYSIS_COPY.keepComparison }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    // Under m-1 — the workspace it was taken in — even though it names two
    // colleagues. It does not appear in Rowan Escobar's workspace.
    expect(post).toHaveBeenCalledWith("/v1/growth/members/m-1/analyses", {
      kind: "compare",
      title: "Dana Whitfield vs Rowan Escobar",
      content: "## Friction and fit",
      inputs: {
        subjectIds: [],
        subjectNames: ["Dana Whitfield", "Rowan Escobar"],
        notice: "Server notice.",
      },
    })
    expect(toast.success).toHaveBeenCalledWith(SAVED_ANALYSIS_COPY.saved)
  })

  it("will not keep an empty comparison", async () => {
    slotCtx = { names: [], comparison: "   ", notice: "" }
    renderPanel()
    expect(
      screen.getByRole("button", { name: SAVED_ANALYSIS_COPY.keepComparison }),
    ).toBeDisabled()
  })

  it("a failed save says so rather than reporting success", async () => {
    post.mockRejectedValue(new Error("nope"))
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: SAVED_ANALYSIS_COPY.keepComparison }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe("TeamComparePanel — the kept list", () => {
  it("a load failure is not an empty list", async () => {
    get.mockRejectedValue(new Error("boom"))
    renderPanel()
    await waitFor(() =>
      expect(screen.getByText(SAVED_ANALYSIS_COPY.loadError)).toBeInTheDocument(),
    )
    expect(screen.queryByText(SAVED_ANALYSIS_COPY.empty)).not.toBeInTheDocument()
  })

  it("says the kept work is private to this manager and stays with this member", async () => {
    renderPanel()
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.getByText(/Kept in Dana Whitfield's workspace/)).toBeInTheDocument()
  })

  it("re-opening renders the KEPT comparison, with its own export", async () => {
    get.mockResolvedValue({ data: { data: { analyses: [keptRow()] } } })
    renderPanel()
    const open = await screen.findByRole("button", {
      name: `${SAVED_ANALYSIS_COPY.open}: Dana Whitfield vs Rowan Escobar`,
    })
    expect(screen.queryByTestId("opened-doc")).not.toBeInTheDocument()

    fireEvent.click(open)
    expect(screen.getByTestId("opened-doc")).toHaveTextContent("One plans, one moves.")

    fireEvent.click(screen.getByRole("button", { name: "Export comparison" }))
    expect(builtDocs[0]?.title).toBe("Dana Whitfield vs Rowan Escobar")
    expect(builtDocs[0]?.sections?.[0]?.body).toContain("One plans, one moves.")
    // The notice the run carried, not the current screen's.
    expect(builtDocs[0]?.notice).toBe("Kept notice.")
  })

  /**
   * A kept row whose `inputs.notice` was absent — an older row, or one written
   * by something else. The export must still carry the REAL-PERSON notice
   * rather than leaving the caveat off: the document outlives the tab and
   * reaches people who never saw whatever the screen said.
   */
  it("a kept comparison with no notice still exports the real-person caveat", async () => {
    get.mockResolvedValue({
      data: { data: { analyses: [keptRow({ inputs: { subjectNames: ["Dana Whitfield"] } })] } },
    })
    renderPanel()
    fireEvent.click(
      await screen.findByRole("button", {
        name: `${SAVED_ANALYSIS_COPY.open}: Dana Whitfield vs Rowan Escobar`,
      }),
    )
    fireEvent.click(screen.getByRole("button", { name: "Export comparison" }))
    expect(builtDocs[0]?.notice).toBe(TEAM_STUDIO_COMPARE_COPY.fallbackNotice)
    expect(builtDocs[0]?.notice).toBeTruthy()
  })

  it("lists a row with no recorded cast without an orphaned separator", async () => {
    get.mockResolvedValue({
      data: {
        data: { analyses: [keptRow({ inputs: { notice: "n" } })] },
      },
    })
    renderPanel()
    const item = (await screen.findByText("Dana Whitfield vs Rowan Escobar")).closest("li")
    const second = (item as HTMLElement).querySelectorAll("p")[1]
    expect(second.textContent?.trim()).not.toMatch(/^·|·$/)
  })

  it("deleting the open one closes it, and never reports a permission problem", async () => {
    get.mockResolvedValue({ data: { data: { analyses: [keptRow()] } } })
    renderPanel()
    fireEvent.click(
      await screen.findByRole("button", {
        name: `${SAVED_ANALYSIS_COPY.open}: Dana Whitfield vs Rowan Escobar`,
      }),
    )
    expect(screen.getByTestId("opened-doc")).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Dana Whitfield vs Rowan Escobar" }),
    )
    await waitFor(() => expect(screen.queryByTestId("opened-doc")).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith(SAVED_ANALYSIS_COPY.deleted)
    expect(SAVED_ANALYSIS_COPY.deleteFailed).not.toMatch(/permission|allowed|another|forbidden/i)
  })
})
