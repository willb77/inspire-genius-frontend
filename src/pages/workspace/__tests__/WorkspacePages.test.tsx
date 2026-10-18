import React from "react"
import { render, screen } from "@testing-library/react"
import WorkspaceSettingsPage from "../SettingsPage"
import WorkspaceCharacterLabPage from "../CharacterLabPage"
import WorkspaceInterviewLivePage from "../InterviewLivePage"
import WorkspaceInterviewPrepPage from "../InterviewPrepPage"
import WorkspaceInterviewStudioPage from "../InterviewStudioPage"
import WorkspaceJobBlueprintPage from "../JobBlueprintPage"
import WorkspaceTeamCompositionPage from "../TeamCompositionPage"
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

const PAGES: Array<[string, (p: { audience: WorkspaceAudience }) => React.ReactElement, string]> = [
  ["Settings", WorkspaceSettingsPage, "settings"],
  ["Character Lab", WorkspaceCharacterLabPage, "character-lab restricted"],
  ["Interview Live", WorkspaceInterviewLivePage, "interview-live"],
  ["Interview Prep", WorkspaceInterviewPrepPage, "interview-prep"],
  ["Interview Studio", WorkspaceInterviewStudioPage, "interview-studio"],
  ["Job Blueprint", WorkspaceJobBlueprintPage, "job-blueprint"],
  ["Team Composition", WorkspaceTeamCompositionPage, "team-composition"],
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
})
