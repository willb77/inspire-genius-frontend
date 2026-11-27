/**
 * @jest-environment jsdom
 */

/**
 * TaskAgentResultCard renders a task agent's reply. Markdown is OPT-IN: only
 * Interview Prep asks for it. The other consumers (Job Blueprint, Team
 * Composition, the onboarding wizard, Document Research) must keep the
 * plain-text rendering they had, byte for byte.
 */

import fs from "fs"
import path from "path"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import TaskAgentResultCard from "../TaskAgentResultCard"

// react-markdown is ESM and jest cannot transform it; stand in for the renderer.
jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text, className }: { text: string; className?: string }) => (
    <div data-testid="assistant-markdown" className={className}>
      {text}
    </div>
  ),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/services/tasks/tasks.service", () => ({
  tasksService: { saveResult: jest.fn() },
}))

const RESULT = {
  agent_name: "Maven",
  content: "## Section A\n**Bold** question",
  confidence: 0.8,
  suggested_next: null,
  metadata: {},
}

function renderCard(props: Partial<React.ComponentProps<typeof TaskAgentResultCard>> = {}) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <TaskAgentResultCard result={RESULT as never} onRerun={() => undefined} {...props} />
    </QueryClientProvider>,
  )
}

it("by default renders the content as plain pre-wrapped text, not Markdown", () => {
  const { container } = renderCard()
  expect(screen.queryByTestId("assistant-markdown")).not.toBeInTheDocument()
  const block = container.querySelector(".whitespace-pre-wrap")
  expect(block).not.toBeNull()
  // The literal characters survive: nothing parsed them.
  expect(block?.textContent).toBe("## Section A\n**Bold** question")
})

it("with renderMarkdown, hands the content to the Markdown renderer", () => {
  const { container } = renderCard({ renderMarkdown: true })
  const md = screen.getByTestId("assistant-markdown")
  expect(md.textContent).toBe("## Section A\n**Bold** question")
  expect(md).toHaveClass("prose")
  expect(container.querySelector(".whitespace-pre-wrap")).toBeNull()
})

it("only Interview Prep opts in to Markdown; every other consumer renders as before", () => {
  const SRC = path.resolve(__dirname, "../../..")
  const consumers = [
    "components/task-agents/InterviewPrepBody.tsx",
    "components/task-agents/JobBlueprintBody.tsx",
    "components/task-agents/TeamCompositionBody.tsx",
    "pages/onboarding/OnboardingWizardPage.tsx",
    "pages/super-admin/DocumentResearchPage.tsx",
  ]
  const usage = (rel: string) => {
    const text = fs.readFileSync(path.join(SRC, rel), "utf8")
    const at = text.indexOf("<TaskAgentResultCard")
    expect(at).toBeGreaterThan(-1)
    return text.slice(at, text.indexOf("/>", at))
  }
  for (const rel of consumers) {
    const jsx = usage(rel)
    if (rel.endsWith("InterviewPrepBody.tsx")) expect(jsx).toMatch(/\brenderMarkdown\b/)
    else expect(jsx).not.toMatch(/renderMarkdown/)
  }

  // No consumer was missed: the list above is every file that renders the card.
  const found: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__" && entry.name !== "node_modules") walk(p)
      } else if (/\.tsx$/.test(entry.name) && fs.readFileSync(p, "utf8").includes("<TaskAgentResultCard")) {
        found.push(path.relative(SRC, p).split(path.sep).join("/"))
      }
    }
  }
  walk(SRC)
  expect(found.sort()).toEqual([...consumers].sort())
})
