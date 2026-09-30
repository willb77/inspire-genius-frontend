/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import ScenarioPanel from "../ScenarioPanel"
import type { ScenarioCopy, ScenarioPort, ScenarioStorePort } from "../ports"

/**
 * The saved-scenarios card's four states (TDS-3).
 *
 * `store` was optional on the port from the start so a caller could arrive
 * later, and TDS-3 is that caller. What arriving exposed is that the panel had
 * three states where it needed four: `store.isLoading` and
 * `!store.scenarios?.length` and the list — with no branch for a read that
 * FAILED, which fell through to "Nothing kept yet." and told the operator their
 * saved work was gone.
 *
 * `isError` is optional on the port, so this also pins that a store which does
 * not report it behaves exactly as it did before.
 *
 * Invented people — this repo is public.
 */

jest.mock("@/components/prism/narrative/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))
jest.mock("@/components/prism/narrative/NarrativeExportButtons", () => ({
  __esModule: true,
  default: () => <button type="button">Export</button>,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

const COPY: ScenarioCopy = {
  castTitle: "Rehearse a situation",
  castEmpty: "Nobody yet.",
  castCapHint: undefined,
  castBlurb: "blurb",
  errorNeedOne: "Choose at least one person.",
  errorNeedSituation: "Describe the situation first.",
  saveFailed: "Could not save",
  presets: [],
  titlePlaceholder: "The Q3 handover",
  runningLabel: "Working it through…",
  subtitle: "PRISM team scenario",
  metaLabel: "People",
  savedBlurb: "Each run keeps the names as they were at the time.",
  filePrefix: "PRISM_Profile_",
  footer: (t) => t,
  fallbackNotice: "notice",
}

function port(store?: ScenarioStorePort): ScenarioPort {
  return {
    cast: { subjects: [], isLoading: false },
    run: { run: jest.fn(), pending: false },
    store,
  }
}

function store(over: Partial<ScenarioStorePort> = {}): ScenarioStorePort {
  return {
    scenarios: [],
    isLoading: false,
    save: { run: jest.fn(), pending: false },
    remove: { run: jest.fn(), pending: false },
    ...over,
  }
}

const LOAD_ERROR = /could not be loaded\. This is a load failure, not an empty list/i

it("with no store, offers no saved list at all", () => {
  render(<ScenarioPanel port={port()} copy={COPY} />)
  expect(screen.queryByText("Saved scenarios")).not.toBeInTheDocument()
  expect(screen.queryByText("Nothing kept yet.")).not.toBeInTheDocument()
})

it("an empty store says it is empty", () => {
  render(<ScenarioPanel port={port(store())} copy={COPY} />)
  expect(screen.getByText("Saved scenarios")).toBeInTheDocument()
  expect(screen.getByText("Nothing kept yet.")).toBeInTheDocument()
  expect(screen.queryByText(LOAD_ERROR)).not.toBeInTheDocument()
})

it("a FAILED read says it failed, and does not say the list is empty", () => {
  render(
    <ScenarioPanel port={port(store({ scenarios: undefined, isError: true }))} copy={COPY} />,
  )
  expect(screen.getByText(LOAD_ERROR)).toBeInTheDocument()
  expect(screen.queryByText("Nothing kept yet.")).not.toBeInTheDocument()
})

it("a store that does not report isError behaves exactly as before", () => {
  // The Character Lab's store, unchanged by TDS-3: `isError` absent.
  render(<ScenarioPanel port={port(store({ scenarios: undefined }))} copy={COPY} />)
  expect(screen.getByText("Nothing kept yet.")).toBeInTheDocument()
  expect(screen.queryByText(LOAD_ERROR)).not.toBeInTheDocument()
})

it("loading is neither empty nor failed", () => {
  render(
    <ScenarioPanel
      port={port(store({ scenarios: undefined, isLoading: true, isError: false }))}
      copy={COPY}
    />,
  )
  expect(screen.queryByText("Nothing kept yet.")).not.toBeInTheDocument()
  expect(screen.queryByText(LOAD_ERROR)).not.toBeInTheDocument()
})

it("lists what was kept, with the names as they were at the time", () => {
  render(
    <ScenarioPanel
      port={port(
        store({
          scenarios: [
            {
              id: "s-1",
              title: "The Q3 handover",
              situation: "A deadline moved.",
              character_ids: ["m-1"],
              character_names: ["Dana Whitfield"],
              result: { individual: { "m-1": "asks" }, collaborative: "they converge" },
              notice: "notice",
              created_at: "2026-09-20T10:00:00Z",
              updated_at: null,
            },
          ],
        }),
      )}
      copy={COPY}
    />,
  )
  expect(screen.getByText("The Q3 handover")).toBeInTheDocument()
  expect(screen.getByText(/Dana Whitfield/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Delete The Q3 handover" })).toBeInTheDocument()
})
