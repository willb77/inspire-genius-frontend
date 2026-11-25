/** @jest-environment jsdom */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { NotSharedError, sharesPrismWithCaller, useTeamCast } from "../useTeamCast"
import type { RosterMember } from "@/types/development"

/**
 * U5 guard — a person who does not share PRISM with the caller cannot be added
 * to a Team-view comparison or scenario.
 *
 * The only signal is the roster's server `sharing` field (growth-service
 * TDS-U6b): pickable when `sharing.grantedCategories` contains "prism"; `null`,
 * absent, or any other category list is not pickable. No liveness rule is
 * re-derived here.
 *
 * Invented people — this repo is public.
 */

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

const member = (id: string, name: string, prism: boolean, sharing?: unknown): RosterMember =>
  ({
    memberId: id,
    name,
    coverage: { prism, clifton: false, disc: false },
    planStatus: "no_plan",
    ...(sharing === undefined ? {} : { sharing }),
  }) as RosterMember

const granted = (categories: string[], state = "granted") => ({
  state,
  grantedCategories: categories,
  expiresAt: null,
  requestedAt: null,
  canRequest: false,
})

const ROSTER = [
  member("m-shared", "Dana Whitfield", true, granted(["prism", "goals"])),
  member("m-null", "Rowan Escobar", true, null),
  member("m-goals-only", "Priya Lindqvist", true, granted(["goals"])),
  member("m-absent", "Tomas Aguirre", true),
  member("m-revoked", "Mei Halloran", true, granted([], "revoked")),
  // Shares PRISM but has none on file: excluded for that reason, not counted
  // as "not shared".
  member("m-no-prism", "Jun Okafor", false, granted(["prism"])),
]

const NOT_SHARED = "Not shared with you."

beforeEach(() => {
  getRoster.mockReset().mockResolvedValue({ data: { data: ROSTER } })
  getDossier.mockReset().mockResolvedValue({
    status: 200,
    data: { data: { member: { name: "Dana Whitfield" }, profile: { prism: [] } } },
  })
  getFullPrism.mockReset().mockResolvedValue({ data: { data: null } })
})

describe("sharesPrismWithCaller", () => {
  it("is true only when grantedCategories contains prism", () => {
    expect(sharesPrismWithCaller(ROSTER[0])).toBe(true)
    expect(sharesPrismWithCaller(ROSTER[1])).toBe(false) // null: not known
    expect(sharesPrismWithCaller(ROSTER[2])).toBe(false) // another category
    expect(sharesPrismWithCaller(ROSTER[3])).toBe(false) // field absent
    expect(sharesPrismWithCaller(ROSTER[4])).toBe(false) // nothing live
  })

  it("does not read state: a 'granted' state with no prism category is not pickable", () => {
    expect(sharesPrismWithCaller(member("x", "X", true, granted([], "granted")))).toBe(false)
  })

  it("survives a malformed field rather than treating it as shared", () => {
    expect(sharesPrismWithCaller(member("x", "X", true, { grantedCategories: "prism" }))).toBe(false)
    expect(sharesPrismWithCaller(member("x", "X", true, "granted"))).toBe(false)
  })
})

describe("useTeamCast", () => {
  it("lists only people with PRISM on file who share it with the caller", async () => {
    const { result } = renderHook(() => useTeamCast(NOT_SHARED), { wrapper })
    await waitFor(() => expect(result.current.port.subjects).toBeDefined())
    expect(result.current.port.subjects?.map((s) => s.id)).toEqual(["m-shared"])
    expect(result.current.pickableIds).toEqual(["m-shared"])
    // Four have PRISM on file and are left out for sharing; m-no-prism is
    // left out for having no PRISM, which is a different sentence.
    expect(result.current.notShared).toBe(4)
    expect(result.current.withoutPrism).toBe(1)
  })

  it("refuses a not-shared person before any dossier or profile is read", async () => {
    const { result } = renderHook(() => useTeamCast(NOT_SHARED), { wrapper })
    await waitFor(() => expect(result.current.pickableIds).toEqual(["m-shared"]))

    for (const other of ["m-null", "m-goals-only", "m-absent", "m-revoked", "m-no-prism"]) {
      await expect(result.current.resolve(["m-shared", other])).rejects.toThrow(NotSharedError)
    }
    expect(getDossier).not.toHaveBeenCalled()
    expect(getFullPrism).not.toHaveBeenCalled()
  })

  it("resolves a shared person through the member-page cast", async () => {
    const { result } = renderHook(() => useTeamCast(NOT_SHARED), { wrapper })
    await waitFor(() => expect(result.current.pickableIds).toEqual(["m-shared"]))
    const subjects = await result.current.resolve(["m-shared"])
    expect(subjects).toHaveLength(1)
    expect(getDossier).toHaveBeenCalledWith("m-shared")
  })

  it("picks nobody while the roster is loading", () => {
    getRoster.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useTeamCast(NOT_SHARED), { wrapper })
    expect(result.current.port.subjects).toBeUndefined()
    expect(result.current.port.isLoading).toBe(true)
    expect(result.current.pickableIds).toEqual([])
  })
})
