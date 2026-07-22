/**
 * @jest-environment jsdom
 *
 * The shared ArtifactStatusMatrix: renders ✓ (“On file”) / “Add” for each of the
 * 10 canonical fellow artifacts from a sources object, reveals an inline uploader
 * on “Add”, and blocks assessment/doc adds for a still-managed (uninvited) fellow.
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { HonorFellowSources } from "@/types/honor"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import { ArtifactStatusMatrix } from "../_ArtifactUploader"
import { ARTIFACTS, artifactPresent } from "../_artifacts"

function renderMatrix(sources: HonorFellowSources | undefined, compact = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ArtifactStatusMatrix fellowId="f1" sources={sources} compact={compact} />
    </QueryClientProvider>,
  )
}

const SOURCES: HonorFellowSources = {
  fellowId: "f1",
  managed: false,
  assessments: [{ framework: "PRISM", scoreCount: 5 }],
  resume: true,
  bio: false,
  additionalInfo: false,
  goals: false,
}

test("ARTIFACTS lists all 10 canonical artifacts", () => {
  expect(ARTIFACTS).toHaveLength(10)
  expect(ARTIFACTS.map((a) => a.key)).toContain("prism")
  expect(ARTIFACTS.map((a) => a.key)).toContain("goals")
})

test("artifactPresent maps each source flag correctly", () => {
  const prism = ARTIFACTS.find((a) => a.key === "prism")!
  const resume = ARTIFACTS.find((a) => a.key === "resume")!
  const goals = ARTIFACTS.find((a) => a.key === "goals")!
  expect(artifactPresent(SOURCES, prism)).toBe(true)
  expect(artifactPresent(SOURCES, resume)).toBe(true)
  expect(artifactPresent(SOURCES, goals)).toBe(false)
  expect(artifactPresent(undefined, prism)).toBe(false)
})

test("renders ✓ (On file) for present sources and Add for the rest", () => {
  renderMatrix(SOURCES)
  // PRISM + Résumé are on file → two "On file" badges.
  expect(screen.getAllByText("On file")).toHaveLength(2)
  // Present artifacts have no Add affordance; absent ones do.
  expect(screen.queryByRole("button", { name: "Add PRISM" })).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Add Goals" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Add DISC" })).toBeInTheDocument()
})

test("clicking Add Goals reveals the goals uploader", () => {
  renderMatrix(SOURCES)
  fireEvent.click(screen.getByRole("button", { name: "Add Goals" }))
  expect(screen.getByPlaceholderText(/Describe this fellow's goals/i)).toBeInTheDocument()
})

test("a managed (uninvited) fellow blocks assessment/doc adds with a hint", () => {
  renderMatrix({ ...SOURCES, managed: true, assessments: [], resume: false })
  fireEvent.click(screen.getByRole("button", { name: "Add PRISM" }))
  expect(screen.getByText(/Invite the fellow first/i)).toBeInTheDocument()
})

test("compact mode renders abbreviated present/absent badges", () => {
  renderMatrix(SOURCES, true)
  // Present PRISM → labelled ✓ badge; absent Goals → an Add affordance.
  expect(screen.getByLabelText("PRISM on file")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Add Goals" })).toBeInTheDocument()
})
