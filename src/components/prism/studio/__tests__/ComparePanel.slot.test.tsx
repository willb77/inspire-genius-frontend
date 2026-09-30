/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

import ComparePanel from "../ComparePanel"
import type { CompareCopy, ComparePort } from "../ports"
import type { ProfileSummary } from "@/types/character-lab"

/**
 * `comparisonActions` — the one optional render slot TDS-3 added to the SHARED
 * compare panel — driven against the REAL panel.
 *
 * This file exists because of a surviving mutation.
 * `TeamComparePanel.saved.test.tsx` mocks ComparePanel and invokes the slot
 * itself, so deleting the slot's call site in the real panel, or handing it the
 * wrong document, left that suite green. Both are now caught here.
 *
 * Two properties:
 *  1. **No slot, no change.** The Character Lab passes nothing, and must render
 *     exactly as it did before.
 *  2. **The slot gets what the EXPORT gets** — the stitched comparison on
 *     screen, and the same `names` and `notice` that `comparisonDoc()` stamps
 *     on the document. A control that kept a different document from the one
 *     exported would be the worst kind of near-miss: both look right.
 *
 * Invented people — this repo is public.
 */

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))
jest.mock("@/components/prism/narrative/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))

const builtDocs: { notice?: string; meta?: { label: string; value: string }[]; sections?: { body?: string }[] }[] = []
jest.mock("@/components/prism/narrative/NarrativeExportButtons", () => ({
  __esModule: true,
  default: ({ build }: { build: () => unknown }) => (
    <button type="button" onClick={() => builtDocs.push(build() as never)}>
      Export
    </button>
  ),
}))

function subject(id: string, name: string): ProfileSummary {
  return {
    id,
    name,
    source: "",
    notes: "",
    has_analysis: false,
    created_at: null,
    updated_at: null,
  } as ProfileSummary
}

const compareRun = jest.fn()

function port(): ComparePort {
  return {
    cast: {
      subjects: [subject("m-1", "Dana Whitfield"), subject("m-2", "Rowan Escobar")],
      isLoading: false,
    },
    compare: { run: compareRun, pending: false },
    questions: { run: jest.fn(), pending: false },
    ask: { run: jest.fn(), pending: false },
  }
}

const COPY: CompareCopy = {
  groupNoun: "your team",
  castTitle: "Choose who to compare",
  castEmpty: "Nobody yet.",
  castCapHint: undefined,
  errorNeedTwo: "Choose at least two people.",
  errorNeedOne: "Choose at least one person.",
  errorNeedOneToAsk: "Choose at least one person first.",
  compareLabel: "Compare them",
  comparingLabel: "Comparing…",
  compareFailed: "The comparison failed",
  questionsFailed: "Could not fetch questions",
  askFailed: "Could not answer that",
  startersBlurb: "blurb",
  askPlaceholder: "ask",
  askBlurb: "blurb",
  metaLabel: "People",
  comparisonSubtitle: "PRISM team comparison",
  answerSubtitle: "PRISM team Q&A",
  filePrefix: "PRISM_Profile_",
  footer: (t) => t,
  fallbackNotice: "the caller's notice",
}

/**
 * Pick both people and run the comparison.
 *
 * Waits on a SUBSTRING, not the exact first section: a multi-part comparison
 * replaces the first chunk with the stitched document, and by the time this
 * looks the joined string is already on screen.
 */
async function compareBoth() {
  fireEvent.click(screen.getByLabelText(/Dana Whitfield/))
  fireEvent.click(screen.getByLabelText(/Rowan Escobar/))
  fireEvent.click(screen.getByRole("button", { name: /Compare them/ }))
  await waitFor(() => expect(screen.getByText(/Friction and fit/)).toBeInTheDocument())
}

beforeEach(() => {
  jest.clearAllMocks()
  builtDocs.length = 0
  compareRun.mockResolvedValue({
    comparison: "## Friction and fit",
    parts: 1,
    notice: "Server notice.",
    names: ["Dana Whitfield", "Rowan Escobar"],
  })
})

it("with no slot, the comparison card renders exactly as before", async () => {
  render(<ComparePanel port={port()} copy={COPY} />)
  await compareBoth()
  expect(screen.getByText("Dana Whitfield vs Rowan Escobar")).toBeInTheDocument()
  expect(screen.getAllByRole("button", { name: "Export" }).length).toBeGreaterThanOrEqual(1)
  expect(screen.queryByRole("button", { name: "Keep this" })).not.toBeInTheDocument()
})

it("does not render the slot before there is a comparison to act on", () => {
  const seen: unknown[] = []
  render(
    <ComparePanel
      port={port()}
      copy={COPY}
      comparisonActions={(ctx) => {
        seen.push(ctx)
        return <button type="button">Keep this</button>
      }}
    />,
  )
  expect(screen.queryByRole("button", { name: "Keep this" })).not.toBeInTheDocument()
  expect(seen).toHaveLength(0)
})

it("renders the slot on the comparison card once there is one", async () => {
  render(
    <ComparePanel
      port={port()}
      copy={COPY}
      comparisonActions={() => <button type="button">Keep this</button>}
    />,
  )
  await compareBoth()
  expect(screen.getByRole("button", { name: "Keep this" })).toBeInTheDocument()
})

it("hands the slot the same document, names and notice the export is built from", async () => {
  const seen: { names: string[]; comparison: string; notice: string }[] = []
  render(
    <ComparePanel
      port={port()}
      copy={COPY}
      comparisonActions={(ctx) => {
        seen.push(ctx)
        return <button type="button">Keep this</button>
      }}
    />,
  )
  await compareBoth()

  const last = seen[seen.length - 1]
  expect(last.comparison).toBe("## Friction and fit")
  expect(last.names).toEqual(["Dana Whitfield", "Rowan Escobar"])
  expect(last.notice).toBe("Server notice.")

  // And the export agrees, field for field. This is the assertion that catches
  // a slot wired to the selection, or to a stale notice, rather than to the
  // document on screen.
  fireEvent.click(screen.getAllByRole("button", { name: "Export" }).slice(-1)[0])
  const doc = builtDocs[builtDocs.length - 1]
  expect(doc.sections?.[0]?.body).toBe(last.comparison)
  expect(doc.notice).toBe(last.notice)
  expect(doc.meta?.[0]).toEqual({ label: "People", value: last.names.join(", ") })
})

it("a multi-part comparison reaches the slot stitched, not just its first section", async () => {
  compareRun.mockReset()
  compareRun
    .mockResolvedValueOnce({ comparison: "## Friction and fit", parts: 2, notice: "Server notice." })
    .mockResolvedValueOnce({ comparison: "## Where they align", parts: 2, notice: "Server notice." })
  const seen: { comparison: string }[] = []
  render(
    <ComparePanel
      port={port()}
      copy={COPY}
      comparisonActions={(ctx) => {
        seen.push(ctx)
        return <button type="button">Keep this</button>
      }}
    />,
  )
  await compareBoth()
  await waitFor(() =>
    expect(seen[seen.length - 1].comparison).toBe("## Friction and fit\n\n## Where they align"),
  )
})
