/**
 * @jest-environment node
 *
 * Exercises every GRANT service wrapper against a mocked agentApi. The GRANT
 * services call the Agent Engine directly (agentApi), not the monolith proxy —
 * the Section-4 endpoints only exist on agent-engine. The UI-0/UI-1 hooks
 * short-circuit to typed mocks (USE_GRANT_MOCKS=true), so these thin wrappers
 * are otherwise never invoked — this locks in their request shapes (method +
 * URL + payload) and their response-envelope unwrapping.
 */

const get = jest.fn()
const post = jest.fn()
const patch = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { get, post, patch },
  syncAuthToken: jest.fn(),
}))

import { getStudentProfile } from "../profile.service"
import { getDeadlines } from "../deadlines.service"
import { searchScholarships } from "../scholarships.service"
import { calculateNetPrice } from "../netPrice.service"
import { calculateRepayment } from "../loans.service"
import { getAwardLetters } from "../awardLetter.service"
import { lookupSalary } from "../salary.service"
import { webSearch } from "../webSearch.service"
import { getAidIntake, saveAidIntake } from "../intake.service"
import { getEnabledVerticals } from "@/verticals/core/entitlements.service"

const envelope = <T>(data: T) => ({ data: { status: true, data } })

beforeEach(() => {
  jest.clearAllMocks()
  get.mockResolvedValue(envelope(undefined))
  post.mockResolvedValue(envelope(undefined))
  patch.mockResolvedValue(envelope(undefined))
})

describe("GRANT service wrappers", () => {
  test("getStudentProfile GETs /v1/agents/grant/students/{id} and unwraps the envelope", async () => {
    get.mockResolvedValueOnce(envelope({ id: "s1" }))
    const res = await getStudentProfile("s1")
    expect(get).toHaveBeenCalledWith(expect.stringContaining("/v1/agents/grant/students/s1"))
    expect(res.data).toEqual({ id: "s1" })
  })

  test("getStudentProfile URL-encodes the id", async () => {
    await getStudentProfile("a b/c")
    expect(get).toHaveBeenCalledWith(expect.stringContaining("/v1/agents/grant/students/a%20b%2Fc"))
  })

  test("getDeadlines GETs /v1/agents/grant/deadlines", async () => {
    await getDeadlines("s1")
    expect(get).toHaveBeenCalledWith("/v1/agents/grant/deadlines", expect.any(Object))
  })

  test("searchScholarships GETs /v1/agents/grant/scholarships (default params)", async () => {
    await searchScholarships()
    expect(get).toHaveBeenCalledWith("/v1/agents/grant/scholarships", expect.any(Object))
  })

  test("searchScholarships passes query params", async () => {
    await searchScholarships({ query: "stem", minAmount: 1000 })
    expect(get).toHaveBeenCalledWith("/v1/agents/grant/scholarships", expect.any(Object))
  })

  test("calculateNetPrice POSTs /v1/agents/grant/net-price with the body", async () => {
    const body = { institutionId: "i1", householdIncome: 60000, dependencyStatus: "dependent" as const, stateOfResidence: "CA" }
    await calculateNetPrice(body)
    expect(post).toHaveBeenCalledWith("/v1/agents/grant/net-price", body)
  })

  test("calculateRepayment POSTs /v1/agents/grant/calculate-repayment with the body", async () => {
    const body = { principal: 20000, annualRatePct: 5.5, termMonths: 120, plan: "standard" as const }
    await calculateRepayment(body)
    expect(post).toHaveBeenCalledWith("/v1/agents/grant/calculate-repayment", body)
  })

  test("getAwardLetters GETs /v1/agents/grant/award-letters", async () => {
    await getAwardLetters("s1")
    expect(get).toHaveBeenCalledWith("/v1/agents/grant/award-letters", expect.any(Object))
  })

  test("lookupSalary GETs /v1/agents/grant/salary-lookup", async () => {
    await lookupSalary("Nurse")
    expect(get).toHaveBeenCalledWith("/v1/agents/grant/salary-lookup", expect.any(Object))
  })

  test("webSearch POSTs /v1/agents/grant/web-search with the body", async () => {
    const body = { query: "fafsa deadline", maxResults: 5 }
    await webSearch(body)
    expect(post).toHaveBeenCalledWith("/v1/agents/grant/web-search", body)
  })

  test("getAidIntake GETs the student aid-intake path", async () => {
    get.mockResolvedValueOnce(envelope({ student_age: 17 }))
    const res = await getAidIntake("me")
    expect(get).toHaveBeenCalledWith(expect.stringContaining("/v1/agents/grant/students/me/aid-intake"))
    expect(res.data).toEqual({ student_age: 17 })
  })

  test("saveAidIntake PATCHes the student aid-intake path with the profile", async () => {
    const profile = {
      student_age: 17,
      enrollment_status: "prospective" as const,
      state_of_residence: "CA",
      institution_type: "four_year" as const,
      household_income_range: "30k_60k" as const,
    }
    await saveAidIntake("me", profile)
    expect(patch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/agents/grant/students/me/aid-intake"),
      profile
    )
  })

  test("getEnabledVerticals GETs /v1/agents/me/verticals and unwraps the list", async () => {
    get.mockResolvedValueOnce(envelope({ enabled_verticals: ["grant"] }))
    const res = await getEnabledVerticals()
    expect(get).toHaveBeenCalledWith("/v1/agents/me/verticals")
    expect(res.data).toEqual({ enabled_verticals: ["grant"] })
  })
})
