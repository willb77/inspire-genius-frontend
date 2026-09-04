import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { useStudioCast } from "../useStudioCast"
import type { RosterMember } from "@/types/development"

const getRoster = jest.fn()
const getDossier = jest.fn()
const getFullPrism = jest.fn()

jest.mock("@/services/manager/development/growthService", () => ({
  getTeamDevelopmentRoster: () => getRoster(),
  getMemberDossier: (id: string) => getDossier(id),
  getMemberFullPrism: (id: string) => getFullPrism(id),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const member = (id: string, name: string, prism: boolean): RosterMember =>
  ({
    memberId: id,
    name,
    coverage: { prism, clifton: false, disc: false },
    planStatus: "no_plan",
  }) as RosterMember

const dossierFor = (name: string) => ({
  status: 200,
  data: {
    data: {
      member: { name },
      profile: {
        prism: [
          { id: 1, label: "Innovating", score: 70, quadrant: 1 },
          { id: 7, label: "Finishing", score: 30, quadrant: 4 },
        ],
      },
    },
  },
})

const fullPrismFor = (adapted: number | null = 61) => ({
  data: {
    data: {
      hasData: true,
      scales: [
        {
          key: "innovating",
          label: "Innovating",
          group: "Behavior Preferences",
          scores: adapted === null ? { Underlying: 70 } : { Underlying: 70, Adapted: adapted },
        },
        {
          key: "practical_mechanical",
          label: "Practical and mechanical",
          group: "Work Preference Profile",
          scores: { Underlying: 44 },
        },
      ],
      colours: null,
      missing: [],
      coverage: 2,
      fromLegacyRows: false,
      isConflicted: false,
      conflicts: [],
      conflictMessage: null,
    },
  },
})

beforeEach(() => {
  jest.clearAllMocks()
  getFullPrism.mockResolvedValue(fullPrismFor())
  getRoster.mockResolvedValue({
    data: { data: [member("a", "Ann", true), member("b", "Bo", false), member("c", "Cy", true)] },
  })
})

it("lists only people who have PRISM on file, and says how many were left out", async () => {
  // Showing someone with no scores and refusing after the click wastes the
  // click; generating anyway would produce confident prose about nothing and
  // read exactly like a real profile.
  const { result } = renderHook(() => useStudioCast(), { wrapper })
  await waitFor(() => expect(result.current.port.subjects).toHaveLength(2))

  expect(result.current.port.subjects?.map((s) => s.name)).toEqual(["Ann", "Cy"])
  expect(result.current.withoutPrism).toBe(1)
})

it("leaves the list undefined while the roster is loading, not empty", async () => {
  // `undefined` is "we do not know yet"; `[]` is "there is nobody". The picker
  // renders a different, and honest, thing for each.
  getRoster.mockImplementation(() => new Promise(() => {}))
  const { result } = renderHook(() => useStudioCast(), { wrapper })
  expect(result.current.port.subjects).toBeUndefined()
  expect(result.current.port.isLoading).toBe(true)
})

it("resolves only the ids that were chosen", async () => {
  // A dossier is a ~60s agent job. Pre-loading the whole roster to fill a
  // picker would be a minute of work per name nobody selected.
  getDossier.mockImplementation((id: string) =>
    Promise.resolve(dossierFor(id === "a" ? "Ann" : "Cy")),
  )
  const { result } = renderHook(() => useStudioCast(), { wrapper })
  await waitFor(() => expect(result.current.port.subjects).toHaveLength(2))

  const subjects = await result.current.resolve(["a"])
  expect(getDossier).toHaveBeenCalledTimes(1)
  expect(getDossier).toHaveBeenCalledWith("a")
  // Both reads are id-scoped, not just the expensive one. The profile read is
  // cheap, but fetching it for the whole roster would still hand this surface
  // psychometric data for people nobody picked.
  expect(getFullPrism).toHaveBeenCalledTimes(1)
  expect(getFullPrism).toHaveBeenCalledWith("a")
  expect(subjects).toEqual([
    {
      name: "Ann",
      // Canonical keys, per score type — the shape `score_digest` indexes.
      //
      // These now come from the FULL profile, not the dossier: `scores` carries
      // every scale on file with every score type, including the Adapted value
      // the dossier's radar structurally cannot hold. `finishing` is absent
      // here because this fixture's full profile does not list it — which is
      // the honest consequence of the source change, not a dropped scale.
      scores: {
        innovating: { Underlying: 70, Adapted: 61 },
        practical_mechanical: { Underlying: 44 },
      },
      // The brain map is still derived from the dossier's behaviours, never
      // from the server's colour map — which is keyed `orange`, a quadrant
      // PRISM does not have.
      colours: { Green: 70, Gold: 30 },
    },
  ])
})

it("refuses loudly when a chosen person's dossier is still computing", async () => {
  // A 202 is not "this person has no scores". Dropping them silently would
  // compare two people under a heading naming three.
  getDossier.mockImplementation((id: string) =>
    id === "c" ? Promise.resolve({ status: 202, data: {} }) : Promise.resolve(dossierFor("Ann")),
  )
  const { result } = renderHook(() => useStudioCast(), { wrapper })
  await waitFor(() => expect(result.current.port.subjects).toHaveLength(2))

  await expect(result.current.resolve(["a", "c"])).rejects.toThrow(/still being analysed/i)
})

// ─── the full-profile read ──────────────────────────────────────────────
//
// Until this landed, `resolve` built subjects from the dossier alone — 8
// behaviour scales, `Underlying` only, because
// `long_term._load_prism_from_assessments` filters on
// `score_type = 'Underlying'`. Compare and Scenarios were reading a tenth of
// each person's profile, and the write-up asserted there was no adaptation gap
// for people who had one on file.

it("resolves subjects from the full profile, Adapted scores included", async () => {
  getDossier.mockResolvedValue(dossierFor("Ann"))
  const { result } = renderHook(() => useStudioCast(), { wrapper })
  await waitFor(() => expect(result.current.port.subjects).toBeDefined())

  const [subject] = await result.current.resolve(["a"])
  expect(getFullPrism).toHaveBeenCalledWith("a")
  expect(subject.scores.innovating).toEqual({ Underlying: 70, Adapted: 61 })
  // And a scale the behaviour radar does not carry at all.
  expect(subject.scores.practical_mechanical).toEqual({ Underlying: 44 })
})

it("falls back to the behaviour radar when the profile read fails", async () => {
  // A richer read going down must not take a working surface with it. This is
  // also what the suite was silently doing before the mock above existed: the
  // service mock had no `getMemberFullPrism`, the call threw, and every test
  // passed on the fallback path without exercising the new read once.
  getDossier.mockResolvedValue(dossierFor("Ann"))
  getFullPrism.mockRejectedValue(new Error("503"))
  const { result } = renderHook(() => useStudioCast(), { wrapper })
  await waitFor(() => expect(result.current.port.subjects).toBeDefined())

  const [subject] = await result.current.resolve(["a"])
  expect(subject.scores.innovating).toEqual({ Underlying: 70 })
  expect(subject.name).toBe("Ann")
})

it("refuses a conflicted member rather than comparing a blend of two people", async () => {
  // The failure this guards is a disclosure: two assessments under one account
  // were two different people's reports on dev. A comparison built from the
  // agreeing remainder would look entirely normal.
  getDossier.mockResolvedValue(dossierFor("Ann"))
  getFullPrism.mockResolvedValue({
    data: {
      data: {
        hasData: true,
        scales: [],
        colours: null,
        missing: [],
        coverage: 0,
        fromLegacyRows: false,
        isConflicted: true,
        conflicts: ["innovating"],
        conflictMessage: "Ann's assessment records disagree with each other.",
      },
    },
  })
  const { result } = renderHook(() => useStudioCast(), { wrapper })
  await waitFor(() => expect(result.current.port.subjects).toBeDefined())

  await expect(result.current.resolve(["a"])).rejects.toThrow("disagree with each other")
})

// ─── the picker's scale count ───────────────────────────────────────────

it("reports no scale count rather than a false zero", async () => {
  // The roster carries no scale count, and the row used to send `scored: 0`.
  // This list is FILTERED to people whose PRISM exists, so "0 scales scored"
  // printed beside every colleague in it — including two with eighty-seven
  // scales on file — in the one place an operator decides who is worth asking
  // about. `undefined` means "not counted" and prints nothing; `0` is a
  // measured claim that these people have no scores.
  const { result } = renderHook(() => useStudioCast(), { wrapper })
  await waitFor(() => expect(result.current.port.subjects).toHaveLength(2))

  for (const s of result.current.port.subjects ?? []) {
    expect(s.scored).toBeUndefined()
    expect(s).not.toHaveProperty("scored", 0)
  }
})
