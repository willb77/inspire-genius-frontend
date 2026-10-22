/**
 * @jest-environment jsdom
 *
 * Decision path components: the decision form (no default route; a reason,
 * longer to depart from the recommendation; an amendment must change the
 * route), the intake form (attestation; answers as sent), the rule-set editor
 * (the body it builds), the one-screen record, and the gated dashboard entry.
 * Fixtures are synthetic.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { DecisionCaseView, DecisionPathStatus, DecisionRuleSet } from "@/types/job-blueprint"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mutation = () => ({ mutateAsync: jest.fn().mockResolvedValue({ id: "case-1" }), isPending: false })
const mockOpen = mutation()
const mockDecide = mutation()
const mockSave = mutation()
const mockStatus = jest.fn<DecisionPathStatus | null, []>(() => null)
jest.mock("@/hooks/job-blueprint/useDecisionPath", () => ({
  useOpenDecisionCase: () => mockOpen,
  useRecordDecision: () => mockDecide,
  useSaveRuleSet: () => mockSave,
  useDecisionPathStatus: () => mockStatus(),
  decisionPathErrorMessage: (err: { response?: { data?: { detail?: string } } }, fb: string) =>
    err?.response?.data?.detail ?? fb,
}))

import { DecisionForm, IntakeForm } from "../DecisionForms"
import { RuleSetEditor } from "../RuleSetEditor"
import { DecisionRecord } from "../DecisionRecord"
import { DecisionPathEntry } from "../DecisionPathEntry"

const STATUS: DecisionPathStatus = {
  enabled: true, engineVersion: "dp-1", staff: true, superAdmin: false,
  ruleKinds: ["degree", "licensure_path", "background_check_status", "attested_requirement"],
  degreeLevels: ["none", "associate", "bachelor", "master", "doctorate"],
  backgroundStatuses: ["cleared", "pending", "not_started"], onFail: ["refer", "hold", "none"],
  finalRoutes: ["apprentice", "residency", "refer"], minReason: 20, minOverrideReason: 60,
  advisoryNote: "The recommendation is advisory.", backgroundCheckNote: "IG performs no background check.",
}

const RULE_SET: DecisionRuleSet = {
  id: "rs1", name: "District standard", version: 1, status: "active",
  rules: [
    { id: "deg", kind: "degree", label: "Bachelor's degree", operator: "at_least", expected: "bachelor", onFail: "refer", sourceRef: "Std §2.1" },
    { id: "bg", kind: "background_check_status", label: "Background check", operator: "in", expected: ["cleared"], onFail: "hold", sourceRef: "Std §2.3" },
    { id: "att", kind: "attested_requirement", label: "Test passed", operator: "is_true", expected: true, onFail: "none", sourceRef: "Std §3" },
  ],
  routePolicy: [{ when: ["att"], route: "residency" }],
  decisionMakers: [{ sub: "d1", name: "Dana Decider" }], contentSha256: "h", engineVersion: "dp-1",
  createdBy: "Sam", createdAt: null, activatedBy: "Sam", activatedAt: null, integrity: { state: "intact", note: null },
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

beforeEach(() => {
  for (const m of [mockOpen, mockDecide, mockSave]) m.mutateAsync.mockReset().mockResolvedValue({ id: "case-1" })
  mockStatus.mockReturnValue(null)
})

const LONG = "The candidate holds an out-of-state licence that the panel verified in person."
const OK = "Meets the written standard as recorded."

describe("DecisionForm", () => {
  const renderForm = (props: Partial<Parameters<typeof DecisionForm>[0]> = {}) =>
    render(<DecisionForm caseId="c1" recommended="apprentice" status={STATUS} {...props} />)

  it("pre-selects no route and refuses to send without one", async () => {
    renderForm()
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked()
    type("Reason", OK)
    fireEvent.click(screen.getByRole("button", { name: "Record the decision" }))
    expect(await screen.findByText("Choose a route. There is no default.")).toBeInTheDocument()
    expect(mockDecide.mutateAsync).not.toHaveBeenCalled()
  })

  it("confirming needs the short reason; departing needs the long one", async () => {
    renderForm()
    fireEvent.click(screen.getByLabelText("Apprentice"))
    type("Reason", "too short")
    fireEvent.click(screen.getByRole("button", { name: "Record the decision" }))
    expect(await screen.findByText("Give a reason (at least 20 characters).")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Residency"))
    type("Reason", OK)
    fireEvent.click(screen.getByRole("button", { name: "Record the decision" }))
    expect(await screen.findByText(/departing from the recommendation \(at least 60/)).toBeInTheDocument()
    expect(mockDecide.mutateAsync).not.toHaveBeenCalled()
    type("Reason", LONG)
    fireEvent.click(screen.getByRole("button", { name: "Record the decision" }))
    await waitFor(() =>
      expect(mockDecide.mutateAsync).toHaveBeenCalledWith({ id: "c1", body: { finalRoute: "residency", reason: LONG }, amend: false }),
    )
  })

  it("an amendment must change the route and always takes the long reason", async () => {
    renderForm({ amend: true, current: "apprentice" })
    fireEvent.click(screen.getByLabelText("Apprentice"))
    type("Reason", LONG)
    fireEvent.click(screen.getByRole("button", { name: "Amend the decision" }))
    expect(await screen.findByText("An amendment must change the route.")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Refer"))
    type("Reason", OK)
    fireEvent.click(screen.getByRole("button", { name: "Amend the decision" }))
    expect(await screen.findByText(/recorded decision \(at least 60/)).toBeInTheDocument()
    expect(mockDecide.mutateAsync).not.toHaveBeenCalled()
  })

  it("shows the server's refusal", async () => {
    mockDecide.mutateAsync.mockRejectedValueOnce({ response: { data: { detail: "Only a decision-maker named in this case's rule set (version 1) can record a decision." } } })
    renderForm()
    fireEvent.click(screen.getByLabelText("Apprentice"))
    type("Reason", OK)
    fireEvent.click(screen.getByRole("button", { name: "Record the decision" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("named in this case's rule set")
  })
})

describe("IntakeForm", () => {
  const roles = [{ id: "bp1", roleTitle: "Teacher Apprentice" }] as never[]

  it("requires the attestation", async () => {
    render(<IntakeForm status={STATUS} roles={roles} ruleSets={[RULE_SET]} />)
    type("Role", "bp1")
    type("Minimum standard (rule set)", "rs1")
    type("Candidate's name", "Jordan Applicant")
    fireEvent.click(screen.getByRole("button", { name: "Open case and check" }))
    expect(await screen.findByText("Confirm the answers are as your records show")).toBeInTheDocument()
    expect(mockOpen.mutateAsync).not.toHaveBeenCalled()
  })

  it("sends the answers keyed by rule id; an unanswered rule is left out", async () => {
    const opened = jest.fn()
    render(<IntakeForm status={STATUS} roles={roles} ruleSets={[RULE_SET, { ...RULE_SET, id: "rs0", status: "retired" }]} onOpened={opened} />)
    expect(screen.queryByText(/version 1\)/, { selector: "option[value='rs0']" })).toBeNull()
    type("Role", "bp1")
    type("Minimum standard (rule set)", "rs1")
    type("Candidate's name", "Jordan Applicant")
    type(/Bachelor's degree/, "master")
    type(/Test passed/, "yes")
    expect(screen.getByText(/never a reason to refer/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Open case and check" }))
    await waitFor(() =>
      expect(mockOpen.mutateAsync).toHaveBeenCalledWith({
        blueprintId: "bp1", ruleSetId: "rs1", candidateName: "Jordan Applicant", candidateEmail: undefined,
        answers: { deg: "master", att: true }, attest: true,
      }),
    )
    expect(opened).toHaveBeenCalledWith("case-1")
  })
})

describe("RuleSetEditor", () => {
  it("builds the rule set the server expects", async () => {
    render(<RuleSetEditor status={STATUS} draft={null} />)
    type("Name", "District standard")
    type("Label", "Bachelor's degree")
    type("Clause of the written standard", "Std §2.1")
    fireEvent.click(screen.getByRole("button", { name: /Add a rule/ }))
    const labels = screen.getAllByLabelText("Label")
    fireEvent.change(labels[1], { target: { value: "Background check" } })
    fireEvent.change(screen.getAllByLabelText("Clause of the written standard")[1], { target: { value: "Std §2.3" } })
    fireEvent.change(screen.getAllByLabelText("Kind")[1], { target: { value: "background_check_status" } })
    fireEvent.change(await screen.findByLabelText("Accepted values, comma-separated"), { target: { value: "cleared, pending" } })
    fireEvent.change(screen.getAllByLabelText("Rule id")[1], { target: { value: "bg" } })
    type(/Recommend Residency/, "bg")
    type(/Decision-makers/, "a@x.test, b@x.test")
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
    await waitFor(() => expect(mockSave.mutateAsync).toHaveBeenCalled())
    expect(mockSave.mutateAsync.mock.calls[0][0]).toEqual({
      id: undefined,
      body: {
        name: "District standard",
        rules: [
          { id: "degree", kind: "degree", label: "Bachelor's degree", operator: "at_least", expected: "bachelor", onFail: "refer", sourceRef: "Std §2.1" },
          { id: "bg", kind: "background_check_status", label: "Background check", operator: "in", expected: ["cleared", "pending"], onFail: "hold", sourceRef: "Std §2.3" },
        ],
        routePolicy: [{ when: ["bg"], route: "residency" }],
        decisionMakerEmails: ["a@x.test", "b@x.test"],
      },
    })
  })

  it("refuses a rule with no written-standard clause", async () => {
    render(<RuleSetEditor status={STATUS} draft={null} />)
    type("Name", "x")
    type("Label", "Degree")
    type(/Decision-makers/, "a@x.test")
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
    expect(await screen.findByText("Name the clause of the written standard")).toBeInTheDocument()
    expect(mockSave.mutateAsync).not.toHaveBeenCalled()
  })
})

const VIEW: DecisionCaseView = {
  id: "c1", status: "decided", access: "record",
  role: { blueprintId: "bp1", roleTitle: "Teacher Apprentice", version: 2 }, openedAt: "2026-10-22T13:00:00Z",
  advisoryNote: "The recommendation is advisory.",
  candidate: { name: "Jordan Applicant", email: null, accountLinked: false }, openedBy: "Sam Staff",
  ruleSet: RULE_SET,
  summary: {
    recommendedRoute: "apprentice", recommendationReasons: ["Meets every minimum requirement."], recommendedAt: null,
    fitSnapshot: { available: false, reason: "No PRISM profile is on file.", usedForRoute: false, label: "Decision support only." },
    validationSnapshot: { blueprintId: "bp1", blueprintVersion: 2, state: "none", validatedEventId: null, method: null, validatedOn: null, statement: "Not validated by an employer or subject-matter expert." },
    finalRoute: "residency", decidedBy: "Dana Decider", decidedAt: null, decisionReason: LONG,
    confirmed: false, changedFrom: "apprentice", flags: ["intake_person_decided"],
  },
  events: [
    {
      id: "e2", kind: "qualification_check", at: null, actor: "the decision-path engine", ruleSetId: "rs1", ruleSetVersion: 1,
      ruleSetSha256: "h", engineVersion: "dp-1", inputs: { answers: { deg: "master" } },
      result: { metMinimum: true, rules: [{ ruleId: "deg", kind: "degree", label: "Bachelor's degree", operator: "at_least", expected: "bachelor", observed: "master", outcome: "pass", passed: true, onFail: "refer", sourceRef: "Std §2.1" }] },
      recommendedRoute: null, finalRoute: null, reason: null, fitSnapshot: null, validationSnapshot: null,
      replay: { replayable: true, matches: true, note: null, ruleSetHashMatches: true },
    },
    {
      id: "e3", kind: "recommendation", at: null, actor: "the decision-path engine", ruleSetId: "rs1", ruleSetVersion: 1,
      ruleSetSha256: "h", engineVersion: "dp-1", inputs: null, result: { route: "apprentice" },
      recommendedRoute: "apprentice", finalRoute: null, reason: null, fitSnapshot: null, validationSnapshot: null,
      replay: { replayable: true, matches: false, note: "The stored result differs.", ruleSetHashMatches: true },
    },
  ],
  limits: ["IG performs no background check."],
}

describe("DecisionRecord", () => {
  it("shows the whole record on one screen", () => {
    render(<DecisionRecord view={VIEW} />)
    expect(screen.getByText("Jordan Applicant")).toBeInTheDocument()
    expect(screen.getByText(/Rule set: District standard, version 1/)).toBeInTheDocument()
    expect(screen.getByText("Std §2.1")).toBeInTheDocument()
    expect(screen.getByText(/Not validated by an employer/)).toBeInTheDocument()
    expect(screen.getByText(/changed from Apprentice/)).toBeInTheDocument()
    expect(screen.getByText(`Reason: ${LONG}`)).toBeInTheDocument()
    expect(screen.getByText("The person who did the intake also decided.")).toBeInTheDocument()
    expect(screen.getByText(/not used for the route/)).toBeInTheDocument()
    expect(screen.getByText(/Reconstructed: re-running the stored engine/)).toBeInTheDocument()
    expect(screen.getByText(/Does not reconstruct. The stored result differs./)).toBeInTheDocument()
  })
})

describe("DecisionPathEntry", () => {
  it("renders nothing while the switch is off", () => {
    const { container } = render(<MemoryRouter><DecisionPathEntry /></MemoryRouter>)
    expect(container).toBeEmptyDOMElement()
  })

  it("links to the decision path when it is on", () => {
    mockStatus.mockReturnValue(STATUS)
    render(<MemoryRouter><DecisionPathEntry /></MemoryRouter>)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/vertical/job-blueprint/decision-path")
  })
})
