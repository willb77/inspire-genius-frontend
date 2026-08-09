import { render, screen, fireEvent } from "@testing-library/react"
import Moments from "../Moments"
import {
  useAskMoment,
  useMoments,
  useSetMomentState,
} from "@/hooks/lumen/useMoments"
import {
  useCreateSavedPrompt,
  useDeleteSavedPrompt,
  useSavedPrompts,
  useTouchSavedPrompt,
} from "@/hooks/lumen/useSavedPrompts"
import type { Moment, SavedPrompt } from "@/types/lumen"

jest.mock("@/hooks/lumen/useMoments")
jest.mock("@/hooks/lumen/useSavedPrompts")

// Radix's Select never opens under jsdom (no pointer events), so the history
// picker would be untestable as-is. Swapped for a native <select> — the same
// mock the settings and form-modal suites already use, but wired through
// `onValueChange` so the *filtering* is exercised and not just the markup.
jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
  }) => (
    <select
      aria-label="Choose a Moment from your history"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}))

const mockUseMoments = useMoments as jest.MockedFunction<typeof useMoments>
const mockUseAskMoment = useAskMoment as jest.MockedFunction<typeof useAskMoment>
const mockUseSetMomentState = useSetMomentState as jest.MockedFunction<
  typeof useSetMomentState
>
const mockUseSavedPrompts = useSavedPrompts as jest.MockedFunction<typeof useSavedPrompts>
const mockUseCreateSavedPrompt = useCreateSavedPrompt as jest.MockedFunction<
  typeof useCreateSavedPrompt
>
const mockUseDeleteSavedPrompt = useDeleteSavedPrompt as jest.MockedFunction<
  typeof useDeleteSavedPrompt
>
const mockUseTouchSavedPrompt = useTouchSavedPrompt as jest.MockedFunction<
  typeof useTouchSavedPrompt
>

const SAVED: SavedPrompt = {
  id: "sp-1",
  text: "My weekly skip-level",
  label: null,
  use_count: 3,
  last_used_at: "2026-07-26T12:00:00Z",
  created_at: "2026-07-01T12:00:00Z",
}

const MOMENT: Moment = {
  id: "m-1",
  trigger: "pull",
  context: "1:1 with a skip-level",
  body: "Lead with the question.\n\nTry opening with: “How do you see it?”",
  state: "new",
  created_at: "2026-07-24T12:00:00Z",
  delivered_at: "2026-07-24T12:00:00Z",
}

function setup({
  moments = [MOMENT],
  isLoading = false,
  ask = jest.fn(),
  askData = undefined as Moment | undefined,
  askPending = false,
  askError = false,
  setState = jest.fn(),
  savedPrompts = [] as SavedPrompt[],
  savedPromptsError = false,
  savePrompt = jest.fn(),
  removePrompt = jest.fn(),
  touchPrompt = jest.fn(),
} = {}) {
  mockUseMoments.mockReturnValue({
    data: { moments, limit: 20, offset: 0, has_more: false },
    isLoading,
  } as ReturnType<typeof useMoments>)
  mockUseAskMoment.mockReturnValue({
    mutate: ask,
    data: askData,
    isPending: askPending,
    isError: askError,
  } as unknown as ReturnType<typeof useAskMoment>)
  mockUseSetMomentState.mockReturnValue({
    mutate: setState,
    isPending: false,
  } as unknown as ReturnType<typeof useSetMomentState>)
  mockUseSavedPrompts.mockReturnValue({
    data: savedPrompts,
    isError: savedPromptsError,
  } as unknown as ReturnType<typeof useSavedPrompts>)
  mockUseCreateSavedPrompt.mockReturnValue({
    mutate: savePrompt,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateSavedPrompt>)
  mockUseDeleteSavedPrompt.mockReturnValue({
    mutate: removePrompt,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteSavedPrompt>)
  mockUseTouchSavedPrompt.mockReturnValue({
    mutate: touchPrompt,
  } as unknown as ReturnType<typeof useTouchSavedPrompt>)
  return { ask, setState, savePrompt, removePrompt, touchPrompt }
}

describe("Moments", () => {
  afterEach(() => jest.resetAllMocks())

  test("renders the ask box, and the history only once asked for", () => {
    setup()
    render(<Moments />)
    expect(screen.getByRole("heading", { level: 1, name: "Moments" })).toBeInTheDocument()
    expect(screen.getByLabelText("Describe the situation")).toBeInTheDocument()
    // Nothing from the history until it is picked.
    expect(screen.queryByText("Lead with the question.")).not.toBeInTheDocument()

    selectMoment("m-1")
    expect(screen.getByText("Lead with the question.")).toBeInTheDocument()
  })

  test("asks for a Moment with the typed context", () => {
    const { ask } = setup()
    render(<Moments />)
    fireEvent.change(screen.getByLabelText("Describe the situation"), {
      target: { value: "a salary negotiation" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Get a Moment/ }))
    expect(ask).toHaveBeenCalledWith({ context: "a salary negotiation" })
  })

  test("will not ask on an empty or near-empty context", () => {
    const { ask } = setup()
    render(<Moments />)
    // The button stays disabled, so no request is possible.
    expect(screen.getByRole("button", { name: /Get a Moment/ })).toBeDisabled()
    expect(ask).not.toHaveBeenCalled()
  })

  test("a preset fills the box", () => {
    setup()
    render(<Moments />)
    fireEvent.click(screen.getByRole("button", { name: "A salary negotiation" }))
    expect(screen.getByLabelText("Describe the situation")).toHaveValue(
      "A salary negotiation"
    )
  })

  test("act / save / dismiss set the Moment's state", () => {
    const { setState } = setup()
    render(<Moments />)
    selectMoment("m-1")
    fireEvent.click(screen.getByRole("button", { name: /I used this/ }))
    expect(setState).toHaveBeenCalledWith({ momentId: "m-1", state: "acted" })

    fireEvent.click(screen.getByRole("button", { name: /Save/ }))
    expect(setState).toHaveBeenCalledWith({ momentId: "m-1", state: "saved" })

    fireEvent.click(screen.getByRole("button", { name: /Not useful/ }))
    expect(setState).toHaveBeenCalledWith({ momentId: "m-1", state: "dismissed" })
  })

  test("a Moment already acted on offers no further actions", () => {
    setup({ moments: [{ ...MOMENT, state: "acted" }] })
    render(<Moments />)
    // Select it first — otherwise this passes because nothing is rendered at
    // all, which would assert nothing about acted-on Moments.
    selectMoment("m-1")
    expect(screen.getByText("Lead with the question.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /I used this/ })).not.toBeInTheDocument()
  })

  test("says so when guidance was composed without the model pass", () => {
    setup({ askData: { ...MOMENT, id: "m-2", degraded: true } })
    render(<Moments />)
    expect(screen.getByText(/without the full model pass/)).toBeInTheDocument()
  })

  test("shows the empty state before any Moments exist", () => {
    setup({ moments: [] })
    render(<Moments />)
    expect(screen.getByText(/No Moments yet/)).toBeInTheDocument()
  })

  test("shows a skeleton while the feed loads", () => {
    setup({ isLoading: true })
    render(<Moments />)
    expect(screen.getByTestId("moments-loading")).toBeInTheDocument()
  })

  test("surfaces an ask failure inline", () => {
    setup({ askError: true })
    render(<Moments />)
    expect(screen.getByText(/That didn't work/)).toBeInTheDocument()
  })

  describe("saved situations", () => {
    test("pins what the user typed", () => {
      const { savePrompt } = setup()
      render(<Moments />)
      fireEvent.change(screen.getByLabelText("Describe the situation"), {
        target: { value: "the quarterly board update" },
      })
      fireEvent.click(screen.getByRole("button", { name: /Pin this situation/ }))
      expect(savePrompt).toHaveBeenCalledWith({ text: "the quarterly board update" })
    })

    test("won't offer to pin something already pinned", () => {
      // Re-pinning is a harmless no-op server-side, but an enabled button
      // implies it would do something.
      setup({ savedPrompts: [SAVED] })
      render(<Moments />)
      fireEvent.change(screen.getByLabelText("Describe the situation"), {
        target: { value: SAVED.text },
      })
      expect(screen.getByRole("button", { name: /Pinned/ })).toBeDisabled()
    })

    test("won't offer to pin something too short to be a situation", () => {
      setup()
      render(<Moments />)
      expect(screen.getByRole("button", { name: /Pin this situation/ })).toBeDisabled()
    })

    test("picking a saved situation fills the box and records the reuse", () => {
      // The counter drives ordering only — the ask must never wait on it.
      const { touchPrompt } = setup({ savedPrompts: [SAVED] })
      render(<Moments />)
      fireEvent.click(screen.getByRole("button", { name: SAVED.text }))
      expect(screen.getByLabelText("Describe the situation")).toHaveValue(SAVED.text)
      expect(touchPrompt).toHaveBeenCalledWith(SAVED.id)
    })

    test("a pinned situation can be unpinned", () => {
      const { removePrompt } = setup({ savedPrompts: [SAVED] })
      render(<Moments />)
      fireEvent.click(screen.getByRole("button", { name: `Remove "${SAVED.text}"` }))
      expect(removePrompt).toHaveBeenCalledWith(SAVED.id)
    })

    test("hides pinning entirely against a backend without the routes", () => {
      // The frontend ships to dev and staging-B on merge while the backend is
      // promoted separately, so an environment WILL exist where these routes
      // 404. An enabled button that silently fails is worse than no button.
      setup({ savedPromptsError: true })
      render(<Moments />)
      expect(
        screen.queryByRole("button", { name: /Pin this situation/ })
      ).not.toBeInTheDocument()
      // The rest of the page keeps working.
      expect(screen.getByRole("button", { name: /Get a Moment/ })).toBeInTheDocument()
    })

    test("shows no pinned section when the user has kept nothing", () => {
      setup()
      render(<Moments />)
      expect(screen.queryByText("Your pinned situations")).not.toBeInTheDocument()
    })
  })

  describe("history picker", () => {
    const OTHER: Moment = {
      id: "m-2",
      trigger: "pull",
      context: "Salary negotiation",
      body: "Name a number first.",
      state: "new",
      created_at: "2026-07-25T12:00:00Z",
      delivered_at: "2026-07-25T12:00:00Z",
    }

    test("appears from the very first Moment", () => {
      // Nothing renders until something is picked, so with a single Moment the
      // picker is the only way to reach it. Gating it on two would strand that
      // user with guidance they cannot open.
      setup({ moments: [MOMENT] })
      render(<Moments />)
      expect(
        screen.getByRole("combobox", { name: /choose a moment/i })
      ).toBeInTheDocument()
    })

    test("shows nothing, and says why, until something is picked", () => {
      setup({ moments: [MOMENT, OTHER] })
      render(<Moments />)
      expect(screen.queryByText("Lead with the question.")).not.toBeInTheDocument()
      expect(screen.queryByText("Name a number first.")).not.toBeInTheDocument()
      // Never "you have none" — that would tell someone with a full history
      // that it is empty.
      expect(screen.getByText(/You have 2 Moments on file/)).toBeInTheDocument()
    })

    test("All Moments is available, but only as a choice", () => {
      setup({ moments: [MOMENT, OTHER] })
      render(<Moments />)
      selectMoment("__all__")
      expect(screen.getByText("Lead with the question.")).toBeInTheDocument()
      expect(screen.getByText("Name a number first.")).toBeInTheDocument()
    })

    test("names each Moment by its situation, not its id or trigger", () => {
      setup({ moments: [MOMENT, OTHER] })
      render(<Moments />)
      expect(screen.getByRole("option", { name: /1:1 with a skip-level/ })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: /Salary negotiation/ })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "All Moments (2)" })).toBeInTheDocument()
    })

    test("selecting one shows that Moment and only that one", () => {
      setup({ moments: [MOMENT, OTHER] })
      render(<Moments />)
      selectMoment("m-1")
      expect(screen.getByText("Lead with the question.")).toBeInTheDocument()
      expect(screen.queryByText("Name a number first.")).not.toBeInTheDocument()
    })

    test("offers a way back to the whole list", () => {
      setup({ moments: [MOMENT, OTHER] })
      render(<Moments />)
      selectMoment("m-1")
      fireEvent.click(screen.getByRole("button", { name: /show all 2 moments/i }))
      expect(screen.getByText("Name a number first.")).toBeInTheDocument()
    })

    test("a selection that no longer exists returns to the unpicked state", () => {
      // Ask again and the feed refetches; the selected id can vanish. Falling
      // back to the whole list would answer a question nobody asked — the user
      // wanted one Moment, so the honest response is to ask again.
      const { rerender } = renderMoments([MOMENT, OTHER])
      selectMoment("m-2")
      expect(screen.getByText("Name a number first.")).toBeInTheDocument()

      setup({ moments: [MOMENT] })
      rerender(<Moments />)
      expect(screen.queryByText("Name a number first.")).not.toBeInTheDocument()
      expect(screen.queryByText("Lead with the question.")).not.toBeInTheDocument()
      expect(screen.getByText(/You have 1 Moment on file/)).toBeInTheDocument()
    })

    test("proactive Moments fall back to their trigger for a label", () => {
      const cadence: Moment = { ...OTHER, id: "m-3", trigger: "cadence", context: null }
      setup({ moments: [MOMENT, cadence] })
      render(<Moments />)
      expect(
        screen.getByRole("option", { name: /Weekly check-in/ })
      ).toBeInTheDocument()
    })
  })
})

/** Render helper for the picker cases that need to re-render with new data. */
function renderMoments(moments: Moment[]) {
  setup({ moments })
  return render(<Moments />)
}

/**
 * Pick from the history dropdown.
 *
 * Nothing in the feed renders until something is selected, so most assertions
 * about a Moment's contents have to go through here first.
 */
function selectMoment(value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: /choose a moment/i }), {
    target: { value },
  })
}
