const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactElement } from "react"

import EstablishPage from "../EstablishPage"
import PortraitPage from "../PortraitPage"
import CareersPage from "../CareersPage"

import { useAdvanceJourney, useCareerAreas } from "@/hooks/direction-setting/useJourney"
import { useLoadedFrameworks, useMyProfile } from "@/hooks/profile/useProfile"
import { useLatestPrismStatus } from "@/hooks/prism/usePrismRequest"
import {
  useSelfPortrait,
  useSelfPortraitDescription,
  useAskSelfPortrait,
} from "@/hooks/lumen/useSelfPortrait"
import type { CareerAreas } from "@/types/direction-setting"
import type { SelfPortrait as Portrait } from "@/types/lumen"

/**
 * Stages 1–3 of Direction Setting: Establish, Portrait, Careers.
 *
 * Hooks are mocked, never axios — these assert what a person sees, and the
 * three states that matter for each page are loading, "we don't have anything
 * about you yet", and populated. The empty states carry most of the product
 * weight here: a user reaching Careers before PRISM is the *normal* path, and
 * every one of these pages has to explain rather than fail.
 */

jest.mock("@/hooks/direction-setting/useJourney")
jest.mock("@/hooks/profile/useProfile")
jest.mock("@/hooks/prism/usePrismRequest")
jest.mock("@/hooks/lumen/useSelfPortrait")

// The dashboard upload modals are reused wholesale; stand them in so the test
// can assert *which* target the page opened and fire their success callback.
jest.mock("@/components/dashboard/v2/AddPersonalDocModal", () => ({
  AddPersonalDocModal: ({
    target,
    onUploaded,
    onOpenChange,
  }: {
    target: { name: string } | null
    onUploaded?: () => void
    onOpenChange: (open: boolean) => void
  }) =>
    target ? (
      <div>
        <span>personal modal open: {target.name}</span>
        <button type="button" onClick={() => onUploaded?.()}>
          simulate upload
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          close personal modal
        </button>
      </div>
    ) : null,
}))

jest.mock("@/components/dashboard/v2/AddAssessmentModal", () => ({
  AddAssessmentModal: ({
    target,
    onImported,
  }: {
    target: { name: string; framework: string } | null
    onImported?: () => void
  }) =>
    target ? (
      <div>
        <span>assessment modal open: {target.framework}</span>
        <button type="button" onClick={() => onImported?.()}>
          simulate import
        </button>
      </div>
    ) : null,
}))

// react-markdown is ESM and jest can't transform it — mock the renderer the
// reused Lumen narrative card uses (same pattern as SelfPortrait.test).
jest.mock("@/components/user/chat/AssistantMarkdown", () => {
  return function AssistantMarkdown({ text }: { text: string }) {
    return <div>{text}</div>
  }
})

const mockAdvance = useAdvanceJourney as jest.MockedFunction<typeof useAdvanceJourney>
const mockCareers = useCareerAreas as jest.MockedFunction<typeof useCareerAreas>
const mockFrameworks = useLoadedFrameworks as jest.MockedFunction<
  typeof useLoadedFrameworks
>
const mockProfile = useMyProfile as jest.MockedFunction<typeof useMyProfile>
const mockPrismStatus = useLatestPrismStatus as jest.MockedFunction<
  typeof useLatestPrismStatus
>
const mockPortrait = useSelfPortrait as jest.MockedFunction<typeof useSelfPortrait>
const mockDescribe = useSelfPortraitDescription as jest.MockedFunction<
  typeof useSelfPortraitDescription
>
const mockAsk = useAskSelfPortrait as jest.MockedFunction<typeof useAskSelfPortrait>

const renderPage = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

const advanceMutate = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockAdvance.mockReturnValue({ mutate: advanceMutate } as unknown as ReturnType<
    typeof useAdvanceJourney
  >)
})

/* ── Establish ─────────────────────────────────────────────────────────── */

type EstablishState = {
  loading?: boolean
  frameworks?: string[]
  personalDocs?: string[]
  requested?: boolean
}

function setEstablish({
  loading = false,
  frameworks = [],
  personalDocs = [],
  requested = false,
}: EstablishState = {}) {
  mockPrismStatus.mockReturnValue({
    latest: requested ? ({ id: "req-1" } as never) : null,
    hasReadyPrism: false,
    ingest_status: null,
    completed_at: null,
    requested_at: null,
    isLoading: loading,
    isError: false,
  } as ReturnType<typeof useLatestPrismStatus>)
  mockFrameworks.mockReturnValue({
    data: frameworks,
    isLoading: false,
  } as ReturnType<typeof useLoadedFrameworks>)
  mockProfile.mockReturnValue({
    data: { user_id: "u1", facts: [], loaded_frameworks: [], personal_docs: personalDocs },
    isLoading: false,
  } as unknown as ReturnType<typeof useMyProfile>)
}

describe("EstablishPage", () => {
  test("says it is checking rather than showing empty tiles while loading", () => {
    setEstablish({ loading: true })
    renderPage(<EstablishPage />)
    expect(screen.getByText("Checking what we already have…")).toBeInTheDocument()
  })

  test("with nothing on file, offers all four routes in and blocks none of them", () => {
    setEstablish()
    renderPage(<EstablishPage />)
    expect(
      screen.getByRole("heading", { level: 1, name: "What we know about you" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Nothing on file yet — that's a fine place to start.")
    ).toBeInTheDocument()
    for (const label of ["Request it", "Upload report", "Upload résumé", "Add bio"]) {
      expect(screen.getByRole("button", { name: label })).toBeEnabled()
    }
    // The onward link is present even with nothing done — nothing is gated.
    expect(
      screen.getByRole("button", { name: /Go on to your portrait/ })
    ).toBeInTheDocument()
  })

  test("a requested-but-unreturned survey reads as progress, not as untouched", () => {
    setEstablish({ requested: true })
    renderPage(<EstablishPage />)
    expect(
      screen.getByText("Requested — we'll pick the results up automatically")
    ).toBeInTheDocument()
    expect(screen.queryByText("Not requested yet")).not.toBeInTheDocument()
  })

  test("shows what is already on file", () => {
    setEstablish({ frameworks: ["PRISM"], personalDocs: ["resume"] })
    renderPage(<EstablishPage />)
    expect(screen.getByText("Results are in")).toBeInTheDocument()
    expect(screen.getByText("Scores on file")).toBeInTheDocument()
    expect(screen.getByText("On file")).toBeInTheDocument()
    expect(screen.getByText("Not added yet")).toBeInTheDocument()
    expect(screen.getByText(/2 of 3 on file/)).toBeInTheDocument()
  })

  test("the résumé tile opens the shared upload modal and records the stage", () => {
    setEstablish()
    renderPage(<EstablishPage />)

    fireEvent.click(screen.getByRole("button", { name: "Upload résumé" }))
    expect(screen.getByText(/personal modal open: Résumé/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "simulate upload" }))
    expect(advanceMutate).toHaveBeenCalledWith({ stageId: "1", state: "complete" })
  })

  test("the bio tile opens the same modal, and closing it leaves nothing open", () => {
    setEstablish()
    renderPage(<EstablishPage />)

    fireEvent.click(screen.getByRole("button", { name: "Add bio" }))
    expect(screen.getByText(/personal modal open: Bio/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "close personal modal" }))
    expect(screen.queryByText(/personal modal open/)).not.toBeInTheDocument()
  })

  test("requesting the survey goes to the one place PRISM is requested", () => {
    // Deliberately a route, not a second request form: /prism-assessment owns
    // that integration and a duplicate door would drift from it.
    setEstablish()
    renderPage(<EstablishPage />)
    fireEvent.click(screen.getByRole("button", { name: "Request it" }))
    expect(mockNavigate).toHaveBeenCalledWith("/prism-assessment")
  })

  test("offers the way onward without requiring anything first", () => {
    setEstablish()
    renderPage(<EstablishPage />)
    fireEvent.click(screen.getByRole("button", { name: /Go on to your portrait/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/portrait")
  })

  test("the PRISM-report tile opens the assessment import modal and records the stage", () => {
    setEstablish()
    renderPage(<EstablishPage />)

    fireEvent.click(screen.getByRole("button", { name: "Upload report" }))
    expect(screen.getByText(/assessment modal open: PRISM/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "simulate import" }))
    expect(advanceMutate).toHaveBeenCalledWith({ stageId: "1", state: "complete" })
  })
})

/* ── Portrait ──────────────────────────────────────────────────────────── */

const FULL_PORTRAIT: Portrait = {
  prism: { dominant_quadrant: "Green", quadrants: { green: 80, blue: 20 } },
  corroborating: [
    { framework: "BigFive", confidence: 0.92, maps_to: "Green", agrees_with_prism: true },
    { framework: "DISC", confidence: 0.85, maps_to: "Blue", agrees_with_prism: false },
  ],
  convergences: ["BigFive corroborates PRISM Green."],
  tensions: ["DISC implies Blue but PRISM shows Green."],
  headline: "Your PRISM profile leads Green.",
  instruments: ["BigFive", "DISC", "PRISM"],
  confidence: "moderate",
  sources: { prism: true, assessments: true, resume: false, bio: false },
  coverage: "Composed from 2 sources.",
}

function setPortrait(data: Portrait | undefined, extra: Record<string, unknown> = {}) {
  mockPortrait.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  } as ReturnType<typeof useSelfPortrait>)
  mockDescribe.mockReturnValue({
    data: {
      answer: "You lead with steadiness.",
      is_description: true,
      disclaimer: "A mirror, not a diagnosis.",
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useSelfPortraitDescription>)
  mockAsk.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
    data: undefined,
  } as unknown as ReturnType<typeof useAskSelfPortrait>)
}

describe("PortraitPage", () => {
  test("shows a skeleton while composing", () => {
    setPortrait(undefined, { isLoading: true })
    renderPage(<PortraitPage />)
    expect(screen.getByTestId("ds-portrait-loading")).toBeInTheDocument()
  })

  test("with nothing on file it explains and points back to Establish, not an error", () => {
    setPortrait(undefined)
    renderPage(<PortraitPage />)
    expect(screen.getByText("Nothing to read from yet")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Tell us about you first" })
    ).toHaveAttribute("href", "/vertical/direction-setting/establish")
  })

  test("without PRISM it still reads what it has, and says what PRISM would add", () => {
    setPortrait({
      ...FULL_PORTRAIT,
      prism: null,
      corroborating: [],
      convergences: [],
      tensions: [],
      headline: "Built from your résumé — the record of what you've actually done.",
      instruments: [],
      confidence: "low",
      sources: { prism: false, assessments: false, resume: true, bio: false },
      coverage: "This read rests on your résumé alone.",
    })
    renderPage(<PortraitPage />)
    expect(screen.getByText("No PRISM yet")).toBeInTheDocument()
    expect(screen.getByText(/rests on your résumé alone/)).toBeInTheDocument()
    expect(screen.getByText(/1 of 4 sources on file/)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Request or upload PRISM" })
    ).toBeInTheDocument()
  })

  test("populated: leads with the PRISM anchor and keeps the tensions visible", () => {
    setPortrait(FULL_PORTRAIT)
    renderPage(<PortraitPage />)
    expect(
      screen.getByRole("heading", { level: 1, name: "What you're actually like" })
    ).toBeInTheDocument()
    expect(screen.getByText("Green leads")).toBeInTheDocument()
    expect(screen.getByText("Where they pull apart")).toBeInTheDocument()
    expect(
      screen.getByText("DISC implies Blue but PRISM shows Green.")
    ).toBeInTheDocument()
    // A tension is framed as context-dependence, never as a flaw in the person.
    expect(screen.getByText(/isn't a mistake in you/)).toBeInTheDocument()
  })

  test("states what the read is built from, absences included", () => {
    setPortrait(FULL_PORTRAIT)
    renderPage(<PortraitPage />)
    expect(screen.getByText("What this is built from")).toBeInTheDocument()
    expect(screen.getByText(/2 of 4 sources on file/)).toBeInTheDocument()
    expect(screen.getByText(/signal in its own right/)).toBeInTheDocument()
    expect(screen.getByText("Composed from 2 sources.")).toBeInTheDocument()
  })

  test("a genuine load failure says so without blaming the user", () => {
    setPortrait(undefined, { isError: true })
    renderPage(<PortraitPage />)
    expect(
      screen.getByText(/couldn't put your portrait together just now/)
    ).toBeInTheDocument()
  })
})

/* ── Careers ───────────────────────────────────────────────────────────── */

const FULL_CAREERS: CareerAreas = {
  families: [
    {
      family: "Operations",
      affinity: 82,
      pivotDifficulty: "low",
      distance: 0.18,
      dimensionsConsidered: 8,
    },
    {
      family: "Sales",
      affinity: 61,
      pivotDifficulty: "moderate",
      distance: 0.39,
      dimensionsConsidered: 8,
    },
  ],
  topFamilies: ["Operations"],
  skillLadders: [
    { family: "Operations", steps: ["Coordinator", "Operations lead", "Head of ops"] },
  ],
  dimensionsEvaluated: 8,
}

function setCareers(data: CareerAreas | undefined, extra: Record<string, unknown> = {}) {
  mockCareers.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  } as ReturnType<typeof useCareerAreas>)
}

describe("CareersPage", () => {
  test("shows it is working rather than an empty list", () => {
    setCareers(undefined, { isLoading: true })
    renderPage(<CareersPage />)
    expect(
      screen.getByText("Working out which kinds of work suit you…")
    ).toBeInTheDocument()
  })

  test("an empty result with a note is explained, never rendered as an error", () => {
    // The backend answers 200 + `note` when there's no PRISM on file. This is
    // the normal state of someone who reached Stage 3 first, and the page must
    // read as an explanation with a way forward.
    setCareers({
      families: [],
      note: "Add or complete your PRISM assessment to see ranked career areas.",
    })
    renderPage(<CareersPage />)
    expect(screen.getByText("Nothing to rank yet")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Add or complete your PRISM assessment to see ranked career areas."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Add your PRISM/ })).toHaveAttribute(
      "href",
      "/vertical/direction-setting/establish"
    )
    expect(screen.queryByText(/couldn't work out your career areas/)).not.toBeInTheDocument()
  })

  test("populated: ranks the families, bands the pivot, and shows the ladders", () => {
    setCareers(FULL_CAREERS)
    renderPage(<CareersPage />)
    expect(
      screen.getByRole("heading", { level: 1, name: "What kind of work suits you" })
    ).toBeInTheDocument()
    // "Operations" appears twice — as a ranked family and as its skill ladder.
    expect(screen.getAllByText("Operations").length).toBe(2)
    expect(screen.getByText("Sales")).toBeInTheDocument()
    expect(screen.getByText("low pivot")).toBeInTheDocument()
    expect(screen.getByText("moderate pivot")).toBeInTheDocument()
    expect(screen.getByText("82 / 100")).toBeInTheDocument()
    // Every number is inspectable — dimension count and distance are both shown.
    expect(screen.getAllByText(/8 of your behavioural dimensions/)).toHaveLength(2)
    expect(screen.getByText(/distance of 0\.18/)).toBeInTheDocument()
    expect(screen.getByText("Head of ops")).toBeInTheDocument()
  })

  test("says plainly that the ranking is deterministic", () => {
    setCareers(FULL_CAREERS)
    renderPage(<CareersPage />)
    expect(
      screen.getByText(/the same profile always produces the same order/)
    ).toBeInTheDocument()
  })

  test("a real failure is surfaced as a failure", () => {
    setCareers(undefined, { isError: true })
    renderPage(<CareersPage />)
    expect(screen.getByText(/couldn't work out your career areas/)).toBeInTheDocument()
  })
})
