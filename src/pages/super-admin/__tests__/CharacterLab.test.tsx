import { act, render, screen, fireEvent, waitFor } from "@testing-library/react"
import CharacterLab from "../CharacterLab"
import type { Rubric } from "@/types/character-lab"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

const generateMutate = jest.fn()
const batteryMutate = jest.fn()
const analyseMutate = jest.fn()
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
      dimensions: [
        { key: "initiating", label: "Initiating", measures: "Starting things.", high: "Starts.", low: "Waits.", is_trait: true },
      ],
    },
    {
      group: "Core Traits",
      definition: "Six broad traits.",
      per_score_type: false,
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
      scores: { decisiveness: { Underlying: 90 } },
      evidence: {},
      missing: [],
    })
    analyseMutate.mockReset().mockResolvedValue("## The shape of this profile\nRed-dominant.")
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
      release({ group: "Core Traits", scores: {}, evidence: {}, missing: [] })
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
      expect.objectContaining({ colours: { Green: 71.5, Red: 85 } }),
    )
    expect(await screen.findByText(/Red-dominant/)).toBeInTheDocument()
  })

  it("labels a single-value battery as not varying by score type", async () => {
    render(<CharacterLab />)
    fillAndSubmit()
    expect(await screen.findByText(/does not vary by\s+score type/i)).toBeInTheDocument()
  })
})
