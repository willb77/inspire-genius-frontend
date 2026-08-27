import { act, render, screen, fireEvent, waitFor } from "@testing-library/react"
import CharacterLab from "../CharacterLab"
import type { Rubric } from "@/types/character-lab"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

// react-markdown ships ESM that Jest does not transform; the platform's other
// tests stub the wrapper component the same way.
jest.mock("@/components/super-admin/character-lab/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))

// The three new tabs are exercised by their own suites. Stubbing them here
// keeps this file about the Build tab and stops an unrelated failure in, say,
// the scenario panel from reading as a regression in profile generation.
// Stubbed as a button that calls the page's real `onLoad`. A stub that only
// rendered a div would let this suite assert that a placeholder appeared, which
// proves nothing about whether loading a saved character works.
jest.mock("@/components/super-admin/character-lab/ProfileLibrary", () => ({
  __esModule: true,
  default: ({ onLoad }: { onLoad: (id: string) => void }) => (
    <button onClick={() => onLoad("p1")}>load saved</button>
  ),
}))
jest.mock("@/components/super-admin/character-lab/ComparePanel", () => ({
  __esModule: true,
  default: () => <div>compare stub</div>,
}))
jest.mock("@/components/super-admin/character-lab/ScenarioPanel", () => ({
  __esModule: true,
  default: () => <div>scenario stub</div>,
}))

const getProfileMock = jest.fn()
jest.mock("@/services/super-admin/character-lab/characterLab.service", () => ({
  getProfile: (...args: unknown[]) => getProfileMock(...args),
}))

const exportPdfMock = jest.fn()
jest.mock("@/lib/exportCharacterPdf", () => ({
  exportProfilePdf: (...args: unknown[]) => exportPdfMock(...args),
}))

const generateMutate = jest.fn()
const batteryMutate = jest.fn()
const analyseMutate = jest.fn()
const saveProfileMutate = jest.fn()
let rubricResult: { data: Rubric | undefined; isLoading: boolean; error: unknown } = {
  data: undefined,
  isLoading: false,
  error: null,
}

jest.mock("@/hooks/super-admin/useCharacterLab", () => ({
  useRubric: () => rubricResult,
  useGenerateProfile: () => ({ mutateAsync: generateMutate, isPending: false }),
  useScoreBattery: () => ({ mutateAsync: batteryMutate, isPending: false }),
  useAnalyseProfile: () => ({ mutateAsync: analyseMutate, isPending: false }),
  useExportProfile: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSaveProfile: () => ({ mutateAsync: saveProfileMutate, isPending: false }),
}))

const RUBRIC: Rubric = {
  notice: "FICTIONAL CHARACTER — synthetic profile.",
  score_types: { Adapted: "presented", Underlying: "instinctive", Consistent: "usual" },
  bands: [
    { min: 0, max: 19, label: "Very low", meaning: "Effectively absent." },
    { min: 80, max: 100, label: "Very high", meaning: "Defining." },
    { min: 20, max: 79, label: "Moderate", meaning: "Situational." },
  ],
  groups: [
    {
      group: "Behavior Preferences",
      definition: "The eight behaviour preferences.",
      per_score_type: true,
      parts: 1,
      dimensions: [
        { key: "initiating", label: "Initiating", measures: "Starting things.", high: "Starts.", low: "Waits.", is_trait: true },
      ],
    },
    {
      group: "Core Traits",
      definition: "Six broad traits.",
      per_score_type: false,
      parts: 1,
      dimensions: [
        { key: "decisiveness", label: "Decisiveness", measures: "Committing.", high: "Decides.", low: "Defers.", is_trait: true },
      ],
    },
  ],
}

const GENERATED = {
  notice: RUBRIC.notice,
  name: "Sonny Corleone",
  source: "The Godfather",
  reading: "Acts first, reflects later.",
  scores: { initiating: { Adapted: 82, Underlying: 88, Consistent: 85 } },
  evidence: { initiating: "Speaks out of turn." },
  missing: [],
  colours: {
    Underlying: [
      { quadrant_id: 1 as const, name: "Green" as const, value: 71.5, band: "High" },
      { quadrant_id: 3 as const, name: "Red" as const, value: 85, band: "Very high" },
    ],
  },
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Sonny Corleone" } })
  fireEvent.click(screen.getByRole("button", { name: /Build profile/i }))
}

describe("CharacterLab", () => {
  beforeEach(() => {
    rubricResult = { data: RUBRIC, isLoading: false, error: null }
    generateMutate.mockReset().mockResolvedValue(GENERATED)
    batteryMutate.mockReset().mockResolvedValue({
      group: "Core Traits",
      part: 0,
      parts: 1,
      scores: { decisiveness: { Underlying: 90 } },
      evidence: {},
      missing: [],
    })
    analyseMutate.mockReset().mockResolvedValue({
      notice: RUBRIC.notice, name: "Sonny Corleone", part: 0, parts: 1,
      sections: ["The shape of this profile"],
      analysis: "## The shape of this profile\nRed-dominant.",
    })
  })

  it("always states that profiles are synthetic and unstored", () => {
    // Non-negotiable on this surface: a fictional profile that reads as a real
    // one is the failure mode with the longest tail.
    render(<CharacterLab />)
    const note = screen.getByRole("note")
    expect(note).toHaveTextContent(/Synthetic profiles/i)
    expect(note).toHaveTextContent(/never written to the PRISM tables/i)
  })

  it("refuses to score when the rubric failed to load", () => {
    rubricResult = { data: undefined, isLoading: false, error: new Error("boom") }
    render(<CharacterLab />)
    expect(screen.getByRole("button", { name: /Build profile/i })).toBeDisabled()
    expect(screen.getByText(/rubric could not be loaded, so scoring is disabled/i)).toBeInTheDocument()
  })

  it("sends the character to the API and renders the derived map", async () => {
    render(<CharacterLab />)
    fillAndSubmit()
    await waitFor(() => expect(generateMutate).toHaveBeenCalled())
    expect(generateMutate).toHaveBeenCalledWith({ name: "Sonny Corleone", source: "", notes: "" })
    expect(await screen.findByText("71.5")).toBeInTheDocument()
    expect(screen.getByText(/Innovating \+ Initiating/)).toBeInTheDocument()
  })

  it("scores the remaining batteries after the map, anchored on the behaviours", async () => {
    render(<CharacterLab />)
    fillAndSubmit()
    await waitFor(() => expect(batteryMutate).toHaveBeenCalled())
    expect(batteryMutate).toHaveBeenCalledWith(
      expect.objectContaining({ group: "Core Traits", behaviours: GENERATED.scores }),
    )
    expect(await screen.findByText("90")).toBeInTheDocument()
  })

  it("does not ask the model for the behaviour battery twice", async () => {
    render(<CharacterLab />)
    fillAndSubmit()
    await waitFor(() => expect(batteryMutate).toHaveBeenCalled())
    const groups = batteryMutate.mock.calls.map((c) => c[0].group)
    expect(groups).not.toContain("Behavior Preferences")
  })

  it("reports a failed battery as missing rather than as zero", async () => {
    batteryMutate.mockRejectedValue(new Error("upstream failed"))
    render(<CharacterLab />)
    fillAndSubmit()
    expect(await screen.findByText(/could not be scored/i)).toBeInTheDocument()
    expect(screen.getByText(/it is missing, not zero/i)).toBeInTheDocument()
  })

  it("will not analyse a profile whose batteries are still running", async () => {
    let release: (v: unknown) => void = () => {}
    batteryMutate.mockReturnValue(new Promise((res) => { release = res }))
    render(<CharacterLab />)
    fillAndSubmit()
    const button = await screen.findByRole("button", { name: /Read the profile/i })
    expect(button).toBeDisabled()
    expect(screen.getByText(/would read a partial profile/i)).toBeInTheDocument()

    // Release inside act() and wait for the resulting state to land. Letting the
    // promise settle after the test ends produces an act() warning and, worse,
    // bleeds a setState into whichever test runs next.
    await act(async () => {
      release({ group: "Core Traits", part: 0, parts: 1, scores: {}, evidence: {}, missing: [] })
    })
    await waitFor(() => expect(button).toBeEnabled())
  })

  it("runs the analysis once the profile is complete", async () => {
    render(<CharacterLab />)
    fillAndSubmit()
    const button = await screen.findByRole("button", { name: /Read the profile/i })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(analyseMutate).toHaveBeenCalled())
    expect(analyseMutate).toHaveBeenCalledWith(
      expect.objectContaining({ colours: { Green: 71.5, Red: 85 }, part: 0 }),
    )
    expect(await screen.findByText(/Red-dominant/)).toBeInTheDocument()
  })

  /**
   * A battery larger than the server's chunk size is split. These pin the
   * behaviour added after Career Development Analysis (26 scales x 3 score
   * types) returned 503 at 30.1s against API Gateway's unraisable 30s cap.
   */
  it("fires one request per part, indexed, for a split battery", async () => {
    rubricResult = {
      data: {
        ...RUBRIC,
        groups: [RUBRIC.groups[0], { ...RUBRIC.groups[1], parts: 3 }],
      },
      isLoading: false,
      error: null,
    }
    render(<CharacterLab />)
    fillAndSubmit()
    await waitFor(() => expect(batteryMutate).toHaveBeenCalledTimes(3))
    expect(batteryMutate.mock.calls.map((c) => c[0].part).sort()).toEqual([0, 1, 2])
  })

  it("keeps the parts that succeeded when one part of a battery fails", async () => {
    // Discarding the whole battery would turn a recoverable gap into an empty
    // one — and an empty battery reads as "this character scored nothing".
    rubricResult = {
      data: {
        ...RUBRIC,
        groups: [RUBRIC.groups[0], { ...RUBRIC.groups[1], parts: 2 }],
      },
      isLoading: false,
      error: null,
    }
    batteryMutate
      .mockResolvedValueOnce({
        group: "Core Traits", part: 0, parts: 2,
        scores: { decisiveness: { Underlying: 90 } }, evidence: {}, missing: [],
      })
      .mockRejectedValueOnce(new Error("gateway timeout"))
    render(<CharacterLab />)
    fillAndSubmit()
    expect(await screen.findByText(/partly scored/i)).toBeInTheDocument()
    expect(screen.getByText("90")).toBeInTheDocument()
    expect(screen.getByText(/missing, not zero/i)).toBeInTheDocument()
  })

  /**
   * The write-up is split for the same reason the batteries are: seven sections
   * of prose over 88 scores returned 503 at the 30s cap.
   */
  it("fetches every analysis part and stitches them in order", async () => {
    analyseMutate.mockImplementation(({ part }: { part: number }) =>
      Promise.resolve({
        notice: "", name: "Sonny Corleone", part, parts: 3,
        sections: [`s${part}`], analysis: `## Section ${part}`,
      }),
    )
    render(<CharacterLab />)
    fillAndSubmit()
    const button = await screen.findByRole("button", { name: /Read the profile/i })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(analyseMutate).toHaveBeenCalledTimes(3))
    expect(analyseMutate.mock.calls.map((c) => c[0].part)).toEqual([0, 1, 2])
    expect(await screen.findByText(/Section 0[\s\S]*Section 1[\s\S]*Section 2/)).toBeInTheDocument()
  })

  it("paces the analysis fan-out instead of firing every part at once", async () => {
    // Seven concurrent parts contend badly enough that one exceeds the
    // gateway's 30s cap; measured 1/7 lost at 7-way, 0/7 at 3-way.
    let inFlight = 0
    let peak = 0
    analyseMutate.mockImplementation(async ({ part }: { part: number }) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return { notice: "", name: "S", part, parts: 7, sections: [`s${part}`], analysis: `## S${part}` }
    })
    render(<CharacterLab />)
    fillAndSubmit()
    const button = await screen.findByRole("button", { name: /Read the profile/i })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(analyseMutate).toHaveBeenCalledTimes(7))
    expect(peak).toBeLessThanOrEqual(3)
  })

  it("marks a failed analysis section instead of silently shortening the write-up", async () => {
    // A missing "Derailers" section reads as "nothing to say about derailers",
    // which is the opposite of true.
    analyseMutate.mockImplementation(({ part }: { part: number }) =>
      part === 1
        ? Promise.reject(new Error("gateway timeout"))
        : Promise.resolve({
            notice: "", name: "S", part, parts: 3,
            sections: [`s${part}`], analysis: `## Section ${part}`,
          }),
    )
    render(<CharacterLab />)
    fillAndSubmit()
    const button = await screen.findByRole("button", { name: /Read the profile/i })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    expect(await screen.findByText(/Section 2 of 3 could not be generated/i)).toBeInTheDocument()
  })

  it("labels a single-value battery as not varying by score type", async () => {
    render(<CharacterLab />)
    fillAndSubmit()
    expect(await screen.findByText(/does not vary by\s+score type/i)).toBeInTheDocument()
  })
})

// ─── Library: saving, loading, and the formats ──────────────────────────

describe("CharacterLab — library and exports", () => {
  beforeEach(() => {
    rubricResult = { data: RUBRIC, isLoading: false, error: null }
    generateMutate.mockReset().mockResolvedValue(GENERATED)
    batteryMutate.mockReset().mockResolvedValue({
      group: "Core Traits",
      part: 0,
      parts: 1,
      scores: { decisiveness: { Underlying: 90 } },
      evidence: {},
      missing: [],
    })
    analyseMutate.mockReset().mockResolvedValue({
      notice: RUBRIC.notice,
      name: "Sonny Corleone",
      part: 0,
      parts: 1,
      sections: ["The shape of this profile"],
      analysis: "## The shape of this profile\nRed-dominant.",
    })
    saveProfileMutate.mockReset().mockResolvedValue({})
    getProfileMock.mockReset()
    exportPdfMock.mockReset()
  })

  it("saves the full per-score-type colours, not the flattened map", async () => {
    // The prose endpoints take a flat {Green: 71.5}. Storing THAT would make a
    // reloaded profile show the same brain map on all three score-type tabs —
    // wrong in a way nobody would think to question.
    render(<CharacterLab />)
    await act(async () => {
      fillAndSubmit()
    })
    await screen.findByText(/Sonny Corleone/)

    fireEvent.click(screen.getByRole("button", { name: /Save to library/i }))
    await waitFor(() => expect(saveProfileMutate).toHaveBeenCalled())

    const body = saveProfileMutate.mock.calls[0][0]
    expect(body.colours).toEqual(GENERATED.colours)
    expect(body.colours.Underlying).toHaveLength(2)
    expect(body.scores).toEqual(expect.objectContaining({ initiating: expect.anything() }))
  })

  it("loads a saved character back onto the Build tab", async () => {
    getProfileMock.mockResolvedValue({
      id: "p1",
      name: "Michael Corleone",
      source: "The Godfather",
      notes: "Cold under pressure.",
      scored: 2,
      has_analysis: true,
      created_at: null,
      updated_at: null,
      reading: "Watches, then acts.",
      analysis: "## The shape of this profile\nControlled.",
      scores: { initiating: { Underlying: 40 }, decisiveness: { Underlying: 95 } },
      colours: GENERATED.colours,
      evidence: {},
      notice: RUBRIC.notice,
    })

    render(<CharacterLab />)
    // Radix activates a tab on mousedown, not click — fireEvent.click alone
    // leaves the panel unmounted and the assertions below would fail for the
    // wrong reason.
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("tab", { name: /Library/i }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /load saved/i }))
    })

    expect(getProfileMock).toHaveBeenCalledWith("p1")
    // The page switched back to Build and is showing the loaded character, not
    // an empty form — the whole point of a recall list.
    expect(await screen.findByText("Michael Corleone")).toBeInTheDocument()
    expect(screen.getByText(/Watches, then acts/)).toBeInTheDocument()
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Michael Corleone")
    // Scores came back, so the battery reads as scored rather than pending.
    expect(screen.getByText("Decisiveness")).toBeInTheDocument()
  })

  it("offers PDF alongside Word and both CSVs", async () => {
    render(<CharacterLab />)
    await act(async () => {
      fillAndSubmit()
    })
    await screen.findByText(/Sonny Corleone/)

    fireEvent.click(screen.getByRole("button", { name: /PDF profile/i }))
    await waitFor(() => expect(exportPdfMock).toHaveBeenCalled())

    // The PDF carries the notice and the same score type the screen shows —
    // an export that silently switched score type would be unfalsifiable.
    const payload = exportPdfMock.mock.calls[0][0]
    expect(payload.notice).toBe(RUBRIC.notice)
    expect(payload.scoreType).toBe("Underlying")
    expect(payload.name).toBe("Sonny Corleone")
  })

  it("renders the write-up as markdown rather than printing the hashes", async () => {
    // It used to sit in a `whitespace-pre-wrap` div under `prose` classes, but
    // @tailwindcss/typography is not installed here — so those classes styled
    // nothing and "## The shape of this profile" printed literally.
    render(<CharacterLab />)
    await act(async () => {
      fillAndSubmit()
    })
    await screen.findByText(/Sonny Corleone/)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Read the profile/i }))
    })
    // ProfileMarkdown is stubbed to render its text, so the assertion is that
    // the analysis reaches it at all rather than being interpolated raw.
    expect(await screen.findByText(/Red-dominant/)).toBeInTheDocument()
  })
})


// ─── A failed save must report, never crash ─────────────────────────────

describe("CharacterLab — a 422 is reported, not rendered", () => {
  beforeEach(() => {
    rubricResult = { data: RUBRIC, isLoading: false, error: null }
    generateMutate.mockReset().mockResolvedValue(GENERATED)
    batteryMutate.mockReset().mockResolvedValue({
      group: "Core Traits", part: 0, parts: 1,
      scores: { decisiveness: { Underlying: 90 } }, evidence: {}, missing: [],
    })
    saveProfileMutate.mockReset()
  })

  it("survives the exact 422 that crashed the page", async () => {
    // FastAPI's `detail` is an ARRAY OF OBJECTS for a validation failure. Passed
    // straight to toast it becomes a React child, React refuses to render an
    // object (#31), and the ErrorBoundary takes the page down — a failed save
    // killed the app. The assertion is that a STRING reaches the toast.
    saveProfileMutate.mockRejectedValue({
      response: {
        data: {
          detail: [
            { type: "string_type", loc: ["body", "evidence", "sd_score"],
              msg: "Input should be a valid string", input: 4 },
          ],
        },
      },
    })

    render(<CharacterLab />)
    await act(async () => { fillAndSubmit() })
    await screen.findByText(/Sonny Corleone/)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Save to library/i }))
    })

    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } }
    expect(toast.error).toHaveBeenCalled()
    const arg = toast.error.mock.calls.at(-1)![0]
    expect(typeof arg).toBe("string")
    expect(arg).toContain("evidence.sd_score")

    // And the page is still standing.
    expect(screen.getByRole("button", { name: /Save to library/i })).toBeInTheDocument()
  })
})
