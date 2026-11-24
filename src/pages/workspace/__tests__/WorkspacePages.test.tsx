import React from "react"
import { render, screen } from "@testing-library/react"
import WorkspaceSettingsPage from "../SettingsPage"
import WorkspaceCharacterLabPage from "../CharacterLabPage"
import WorkspaceInterviewLivePage from "../InterviewLivePage"
import WorkspaceInterviewPrepPage from "../InterviewPrepPage"
import WorkspaceInterviewStudioPage from "../InterviewStudioPage"
import WorkspaceJobBlueprintPage from "../JobBlueprintPage"
import WorkspaceTeamCompositionPage from "../TeamCompositionPage"
import WorkspaceTalentStudioOverviewPage from "../TalentStudioOverviewPage"
import WorkspaceTeamFitPage from "../TeamFitPage"
import type { WorkspaceAudience } from "@/layouts/WorkspaceLayout"

// ROLE-C: each screen managers and practitioners share is one component. What
// matters is that `audience` alone picks the chrome, and that the body is the
// same for both. WorkspaceLayout is real here; the two role layouts are not.
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))
jest.mock("@/components/shared/settings/Settings", () => ({
  __esModule: true,
  default: () => <div data-testid="body">settings</div>,
}))
jest.mock("@/pages/super-admin/CharacterLab", () => ({
  __esModule: true,
  default: () => <div>super-admin page</div>,
  CharacterLabBody: ({ fullAccess }: { fullAccess: boolean }) => (
    <div data-testid="body">{fullAccess ? "character-lab full" : "character-lab restricted"}</div>
  ),
}))
jest.mock("@/components/interview/LiveInterviewBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">interview-live</div>,
}))
jest.mock("@/components/task-agents/InterviewPrepBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">interview-prep</div>,
}))
jest.mock("@/components/interview/StudioInterviewBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">interview-studio</div>,
}))
jest.mock("@/components/task-agents/JobBlueprintBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">job-blueprint</div>,
}))
jest.mock("@/components/task-agents/TeamCompositionBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">team-composition</div>,
}))
jest.mock("@/components/talent-studio/TalentStudioOverviewBody", () => ({
  __esModule: true,
  // The body's links follow the route's audience, so the mock shows which one it was given.
  default: ({ role }: { role: string }) => <div data-testid="body">talent-studio for {role}</div>,
}))
jest.mock("@/components/talent-studio/TeamFitBody", () => ({
  __esModule: true,
  // The member links follow the route's audience, so the mock shows which one it was given.
  default: ({ audience }: { audience: string }) => <div data-testid="body">team-fit for {audience}</div>,
}))

const PAGES: Array<[string, (p: { audience: WorkspaceAudience }) => React.ReactElement, string]> = [
  ["Settings", WorkspaceSettingsPage, "settings"],
  ["Character Lab", WorkspaceCharacterLabPage, "character-lab restricted"],
  ["Interview Live", WorkspaceInterviewLivePage, "interview-live"],
  ["Interview Prep", WorkspaceInterviewPrepPage, "interview-prep"],
  ["Interview Studio", WorkspaceInterviewStudioPage, "interview-studio"],
  ["Job Blueprint", WorkspaceJobBlueprintPage, "job-blueprint"],
  ["Team Composition", WorkspaceTeamCompositionPage, "team-composition"],
  ["Talent Studio Overview", WorkspaceTalentStudioOverviewPage, "talent-studio"],
  ["Team fit", WorkspaceTeamFitPage, "team-fit"],
]

const CASES = PAGES.flatMap(([name, Page, body]) => [
  { name, Page, body, audience: "manager" as const, own: "manager-layout", other: "practitioner-layout" },
  { name, Page, body, audience: "practitioner" as const, own: "practitioner-layout", other: "manager-layout" },
])

describe("ROLE-C shared workspace pages", () => {
  it.each(CASES)("$name for a $audience renders its body in the $audience chrome only", ({ Page, body, audience, own, other }) => {
    render(<Page audience={audience} />)
    expect(screen.getByTestId(own)).toContainElement(screen.getByTestId("body"))
    expect(screen.queryByTestId(other)).not.toBeInTheDocument()
    expect(screen.getByTestId("body")).toHaveTextContent(body)
  })

  // That single prop is what keeps CSV export and CSV import off the coach
  // roles (see CharacterLab.test.tsx for what the prop does).
  it.each(["manager", "practitioner"] as const)("Character Lab stays restricted for a %s", (audience) => {
    render(<WorkspaceCharacterLabPage audience={audience} />)
    expect(screen.getByTestId("body")).toHaveTextContent("character-lab restricted")
  })

  // TS-2: the Overview's links sit under the prefix the page was opened on, so
  // the route's audience, not the signed-in role, is what the body is given.
  it.each(["manager", "practitioner"] as const)("Talent Studio Overview gives its body the %s links", (audience) => {
    render(<WorkspaceTalentStudioOverviewPage audience={audience} />)
    expect(screen.getByTestId("body")).toHaveTextContent(`talent-studio for ${audience}`)
  })

  // TS-4a: the member links on Team fit sit under the prefix the page was opened on.
  it.each(["manager", "practitioner"] as const)("Team fit gives its body the %s audience", (audience) => {
    render(<WorkspaceTeamFitPage audience={audience} />)
    expect(screen.getByTestId("body")).toHaveTextContent(`team-fit for ${audience}`)
  })
})

// N-4 — a practitioner can be a blueprint-validation reviewer (backend #1830),
// so the reviewer's queue is mounted on the practitioner's Job Blueprint page.
// The manager's queue stays on /manager/job-dna, so /manager/job-blueprint must
// not grow a second one. The REAL ValidationReviewQueue runs; only its data
// hooks are stubbed.
const mockValidationEnabled = jest.fn(() => false)
const mockAwaitingValidation = jest.fn<{ data: unknown[] | undefined }, []>(() => ({ data: undefined }))
jest.mock("@/hooks/job-blueprint/useBlueprintValidation", () => ({
  useValidationEnabled: () => mockValidationEnabled(),
  useAwaitingValidation: () => mockAwaitingValidation(),
  useRationale: () => ({ data: undefined, isLoading: false, isError: false }),
}))
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}))

describe("Job Blueprint — N-4 reviewer queue", () => {
  const waiting = {
    blueprintId: "bp1", roleTitle: "Line Supervisor", version: 1, requestedBy: "Test Editor",
    requestedAt: "2026-10-19T10:00:00", note: null,
  }

  it("shows the queue to a practitioner when blueprint_validation is on and a request is waiting", () => {
    mockValidationEnabled.mockReturnValue(true)
    mockAwaitingValidation.mockReturnValue({ data: [waiting] })
    render(<WorkspaceJobBlueprintPage audience="practitioner" />)
    expect(screen.getByTestId("practitioner-layout")).toContainElement(screen.getByTestId("validation-review-queue"))
    expect(screen.getByText("Awaiting your validation")).toBeInTheDocument()
    expect(screen.getByTestId("body")).toHaveTextContent("job-blueprint")
  })

  it("renders no queue for a practitioner when blueprint_validation is off", () => {
    mockValidationEnabled.mockReturnValue(false)
    mockAwaitingValidation.mockReturnValue({ data: [waiting] })
    render(<WorkspaceJobBlueprintPage audience="practitioner" />)
    expect(screen.queryByTestId("validation-review-queue")).not.toBeInTheDocument()
    expect(screen.getByTestId("body")).toHaveTextContent("job-blueprint")
  })

  it("leaves /manager/job-blueprint unchanged even with the switch on", () => {
    mockValidationEnabled.mockReturnValue(true)
    mockAwaitingValidation.mockReturnValue({ data: [waiting] })
    render(<WorkspaceJobBlueprintPage audience="manager" />)
    expect(screen.queryByTestId("validation-review-queue")).not.toBeInTheDocument()
    expect(screen.getByTestId("body")).toHaveTextContent("job-blueprint")
  })
})
