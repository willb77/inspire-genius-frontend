import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { useStudioCast } from "../useStudioCast"
import type { RosterMember } from "@/types/development"

const getRoster = jest.fn()
const getDossier = jest.fn()

jest.mock("@/services/manager/development/growthService", () => ({
  getTeamDevelopmentRoster: () => getRoster(),
  getMemberDossier: (id: string) => getDossier(id),
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

beforeEach(() => {
  jest.clearAllMocks()
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
  expect(subjects).toEqual([
    {
      name: "Ann",
      // Canonical keys, per score type — the shape `score_digest` indexes.
      scores: { innovating: { Underlying: 70 }, finishing: { Underlying: 30 } },
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
