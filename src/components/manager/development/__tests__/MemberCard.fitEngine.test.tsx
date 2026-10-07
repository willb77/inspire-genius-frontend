/** @jest-environment jsdom */
/**
 * 3.3a — the roster card's match line under each value of the
 * FIT_ENGINE_MATCHES_ENABLED build flag.
 *
 * OFF (default): the roster's `topMatch`, as before, and the fit-engine hook is
 * never called. ON: the fit engine's rank-1 role — the same number the Careers
 * tab shows — and nothing at all for any state but `ok` (the old LLM line must
 * not fall through as a fallback). The flag's own env parsing is pinned in
 * src/constants/__tests__/fitEngineMatchesFlag.test.ts; here it is driven
 * through a live getter so one React instance renders every case.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"
import type { MemberFitMatches, RosterMember } from "@/types/development"

let mockFlag = false
const mockHookCalls: Array<[string, boolean]> = []
let mockHookData: MemberFitMatches | undefined

jest.mock("@/constants/development", () => {
  const actual = jest.requireActual("@/constants/development")
  return {
    ...actual,
    get FIT_ENGINE_MATCHES_ENABLED() {
      return mockFlag
    },
  }
})

jest.mock("@/hooks/manager/development/useMemberFitMatches", () => ({
  useMemberFitMatches: (id: string, enabled: boolean) => {
    mockHookCalls.push([id, enabled])
    return { data: mockHookData }
  },
}))

import { MemberCard } from "../MemberCard"

const member: RosterMember = {
  memberId: "m-1",
  name: "Jordan Rivera",
  coverage: { prism: true, clifton: false, disc: false },
  planStatus: "on_track",
  topMatch: { title: "LLM Suggested Role", fitScore: 91 },
}

function renderCard() {
  return render(
    <MemoryRouter>
      <MemberCard member={member} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockFlag = false
  mockHookCalls.length = 0
  mockHookData = undefined
})

it("flag off: shows the roster topMatch and never calls the fit-engine hook", () => {
  renderCard()
  expect(screen.getByTestId("member-card-top-match")).toHaveTextContent("LLM Suggested Role")
  expect(screen.getByTestId("member-card-top-match")).toHaveTextContent("91%")
  expect(mockHookCalls).toEqual([])
})

it("flag on, ok: shows the fit engine's rank-1 role and score", () => {
  mockFlag = true
  mockHookData = {
    state: "ok",
    matches: [
      { rank: 1, roleTitle: "Operations Analyst", jobId: "j1", fitScore: 81 },
      { rank: 2, roleTitle: "Team Lead", jobId: "j2", fitScore: 73 },
    ],
    asOf: "2026-10-01T00:00:00Z",
    ageDays: 5,
  }
  renderCard()
  const line = screen.getByTestId("member-card-top-match")
  expect(line).toHaveTextContent("Operations Analyst")
  expect(line).toHaveTextContent("81%")
  expect(screen.queryByText("LLM Suggested Role")).not.toBeInTheDocument()
  expect(mockHookCalls).toContainEqual(["m-1", true])
})

it.each(["not_shared", "no_snapshot", "unavailable", "no_account"] as const)(
  "flag on, %s: no line at all — the LLM topMatch does not fall through",
  (state) => {
    mockFlag = true
    mockHookData = { state, matches: [], asOf: null, ageDays: null }
    renderCard()
    expect(screen.queryByTestId("member-card-top-match")).not.toBeInTheDocument()
    expect(screen.queryByText("LLM Suggested Role")).not.toBeInTheDocument()
  },
)
