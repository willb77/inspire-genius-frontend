/**
 * @jest-environment jsdom
 *
 * Decision path pages: "not enabled" while the server switch is off; staff get
 * the intake form, others only the case list; a principal's case page shows
 * the recommendation and not the record; only staff see rule sets. Fixtures
 * are synthetic.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type { DecisionCaseView, DecisionPathStatus } from "@/types/job-blueprint"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockStatus = jest.fn<DecisionPathStatus | null, []>(() => null)
const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, isSuccess: true, refetch: jest.fn() })
const mockCases = jest.fn(() => q([] as unknown[]))
const mockRuleSets = jest.fn(() => q([] as unknown[]))
const mockRecord = jest.fn(() => q(null as DecisionCaseView | null))
const mutation = { mutateAsync: jest.fn(), isPending: false }
jest.mock("@/hooks/job-blueprint/useDecisionPath", () => ({
  useDecisionPathStatus: () => mockStatus(),
  useDecisionCases: () => mockCases(),
  useDecisionRuleSets: () => mockRuleSets(),
  useDecisionRecord: () => mockRecord(),
  useOpenDecisionCase: () => mutation,
  useRecordDecision: () => mutation,
  useSaveRuleSet: () => mutation,
  useActivateRuleSet: () => mutation,
  useNewRuleSetVersion: () => mutation,
  decisionPathErrorMessage: (_e: unknown, fb: string) => fb,
}))
jest.mock("@/hooks/job-blueprint/useJobDna", () => ({ useJobDnaList: () => ({ data: [] }) }))

import DecisionPathPage from "../DecisionPathPage"
import DecisionPathCasePage from "../DecisionPathCasePage"
import DecisionPathRuleSetsPage from "../DecisionPathRuleSetsPage"

const STATUS = {
  enabled: true, engineVersion: "dp-1", staff: true, superAdmin: false,
  ruleKinds: ["degree"], degreeLevels: ["bachelor"], backgroundStatuses: ["cleared"], onFail: ["refer"],
  finalRoutes: ["apprentice", "residency", "refer"], minReason: 20, minOverrideReason: 60,
  advisoryNote: "The recommendation is advisory.", backgroundCheckNote: "IG performs no background check.",
} as DecisionPathStatus

const SUMMARY_VIEW = {
  id: "c1", status: "open", access: "summary", role: { blueprintId: "b", roleTitle: "Teacher", version: 1 },
  openedAt: null, advisoryNote: "The recommendation is advisory.", candidateName: "Jordan",
  summary: { recommendedRoute: "residency", recommendationReasons: ["Meets the residency condition."], recommendedAt: null,
             fitSnapshot: null, finalRoute: null },
} as DecisionCaseView

const at = (el: React.ReactElement, path = "/x/c1") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/x/:caseId" element={el} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  mockStatus.mockReturnValue(null)
  mockCases.mockReturnValue(q([]))
  mockRuleSets.mockReturnValue(q([]))
  mockRecord.mockReturnValue(q(null))
})

describe("switched off", () => {
  it.each([
    ["cases", <DecisionPathPage key="a" />],
    ["case", <DecisionPathCasePage key="b" />],
  ])("the %s page says not enabled and nothing else", (_n, el) => {
    at(el)
    expect(screen.getByText("The decision path is not enabled for your organisation.")).toBeInTheDocument()
    expect(screen.queryByRole("form")).toBeNull()
  })

  it("rule sets page says it is for recruiting staff", () => {
    at(<DecisionPathRuleSetsPage />)
    expect(screen.getByText(/managed by your organisation's recruiting staff/)).toBeInTheDocument()
  })
})

describe("switched on", () => {
  it("staff without an active rule set are told to activate one", () => {
    mockStatus.mockReturnValue(STATUS)
    at(<DecisionPathPage />)
    expect(screen.getByText(/Activate a rule set before opening a case/)).toBeInTheDocument()
    expect(screen.getByText("No cases yet.")).toBeInTheDocument()
  })

  it("staff with an active rule set get the intake form", () => {
    mockStatus.mockReturnValue(STATUS)
    mockRuleSets.mockReturnValue(q([{ id: "rs1", status: "active", name: "Std", version: 1, rules: [], decisionMakers: [] }]))
    at(<DecisionPathPage />)
    expect(screen.getByRole("form", { name: "Candidate intake" })).toBeInTheDocument()
  })

  it("a principal gets the case list and no intake", () => {
    mockStatus.mockReturnValue({ ...STATUS, staff: false })
    mockCases.mockReturnValue(q([{ id: "c1", candidateName: "Jordan", status: "open", recommendedRoute: "hold", finalRoute: null }]))
    at(<DecisionPathPage />)
    expect(screen.queryByRole("form", { name: "Candidate intake" })).toBeNull()
    expect(screen.getByRole("link", { name: "Jordan" })).toBeInTheDocument()
    expect(screen.queryByText("New candidate")).toBeNull()
    expect(screen.getByText("Hold")).toBeInTheDocument()
  })

  it("a principal's case page shows the recommendation, not the record or a decision form", () => {
    mockStatus.mockReturnValue({ ...STATUS, staff: false })
    mockRecord.mockReturnValue(q(SUMMARY_VIEW))
    at(<DecisionPathCasePage />)
    expect(screen.getByText("Residency")).toBeInTheDocument()
    expect(screen.queryByText("Every event, in order")).toBeNull()
    expect(screen.queryByRole("heading", { name: "Decision" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Case" })).toBeNull()
    expect(screen.queryByRole("form", { name: "Record the decision" })).toBeNull()
  })

  it("a record viewer on an open case gets the decision form", () => {
    mockStatus.mockReturnValue(STATUS)
    mockRecord.mockReturnValue(q({ ...SUMMARY_VIEW, access: "record", events: [] }))
    at(<DecisionPathCasePage />)
    expect(screen.getByRole("form", { name: "Record the decision" })).toBeInTheDocument()
  })

  it("a super-admin never gets a decision form", () => {
    mockStatus.mockReturnValue({ ...STATUS, staff: false, superAdmin: true })
    mockRecord.mockReturnValue(q({ ...SUMMARY_VIEW, access: "record", events: [] }))
    at(<DecisionPathCasePage />)
    expect(screen.queryByRole("form", { name: "Record the decision" })).toBeNull()
  })

  it("staff see their rule sets with the version actions", () => {
    mockStatus.mockReturnValue(STATUS)
    mockRuleSets.mockReturnValue(q([
      { id: "a", status: "active", name: "Std", version: 1, rules: [], decisionMakers: [{ sub: "d", name: "Dana" }] },
      { id: "b", status: "draft", name: "Std", version: 2, rules: [], decisionMakers: [] },
    ]))
    at(<DecisionPathRuleSetsPage />)
    expect(screen.getByRole("button", { name: "Start a new version" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Activate" })).toBeInTheDocument()
  })
})
