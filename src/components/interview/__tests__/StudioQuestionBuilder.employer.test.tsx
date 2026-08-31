/**
 * @jest-environment jsdom
 *
 * Interview Studio — the curated employer/sector picker.
 *
 * The picker seeds the editable list from a pack anchored to an employer's OWN
 * published framework. Three things must hold: the questions land with their
 * competency as the theme, the provenance disclaimer is shown (it is not
 * optional), and a catalogue failure degrades to "add them another way" rather
 * than blocking the interview.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import StudioQuestionBuilder from "../StudioQuestionBuilder"
import type {
  EmployerPackCatalogue,
  EmployerPackDetail,
} from "@/services/interview/studio.service"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), message: jest.fn() },
}))

const getEmployerPacks = jest.fn()
const getEmployerPack = jest.fn()
jest.mock("@/services/interview/studio.service", () => {
  const actual = jest.requireActual("@/services/interview/studio.service")
  return {
    ...actual,
    studioInterviewService: {
      generateQuestions: jest.fn(),
      getEmployerPacks: (...a: unknown[]) => getEmployerPacks(...a),
      getEmployerPack: (...a: unknown[]) => getEmployerPack(...a),
    },
  }
})

const CATALOGUE: EmployerPackCatalogue = {
  provenance: "Written by Inspires Genius in the style of published frameworks.",
  employers: [
    {
      slug: "amazon-aws",
      name: "Amazon / AWS",
      sector: "Technology",
      sectorSlug: "technology",
      framework: "The 16 Leadership Principles",
      questionCount: 6,
    },
    {
      slug: "mckinsey",
      name: "McKinsey & Company",
      sector: "Management Consulting",
      sectorSlug: "consulting",
      framework: "The Personal Experience Interview (PEI)",
      questionCount: 6,
    },
  ],
  sectors: [
    { slug: "consulting", name: "Management & Strategy Consulting", questionCount: 6 },
  ],
}

const PACK: EmployerPackDetail = {
  pack: {
    kind: "employer",
    slug: "amazon-aws",
    name: "Amazon / AWS",
    sector: "Technology",
    framework: "The 16 Leadership Principles",
    howTheyInterview: "A Bar Raiser outside the hiring team holds the bar.",
    optimizesFor: "Single-owner narratives with quantified results.",
    coachingNote: "Unquantified results and 'we' language are the failure modes.",
    provenance: "Not Amazon's actual interview questions.",
    questionCount: 2,
  },
  questions: [
    {
      id: "behavioral.accountability_ownership",
      text: "Tell me about a time you took responsibility outside your remit.",
      theme: "Accountability & Ownership",
      probes: ["What would have happened otherwise?"],
      strongAnswerCovers: "A clear 'I' narrative and the mechanism you put in place.",
    },
    {
      id: "productivity.metrics_measurement",
      text: "Describe a time the data contradicted what the team believed.",
      theme: "Metrics & Measurement",
      probes: [],
      strongAnswerCovers: "The specific measure and the decision that changed.",
    },
  ],
  provenance: "Not Amazon's actual interview questions.",
}

function renderBuilder(onConfirm = jest.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <StudioQuestionBuilder onConfirm={onConfirm} />
    </QueryClientProvider>,
  )
  return { onConfirm }
}

beforeEach(() => {
  getEmployerPacks.mockReset()
  getEmployerPack.mockReset()
})

it("loads a pack's questions into the editable list, themed by competency", async () => {
  getEmployerPacks.mockResolvedValue(CATALOGUE)
  getEmployerPack.mockResolvedValue(PACK)
  const user = userEvent.setup()
  const { onConfirm } = renderBuilder()

  await user.click(screen.getByRole("tab", { name: /employer framework/i }))
  const select = await screen.findByLabelText(/employer or sector/i)
  await waitFor(() => expect(screen.getByRole("option", { name: "Amazon / AWS" })).toBeInTheDocument())
  await user.selectOptions(select, "amazon-aws")
  await user.click(screen.getByRole("button", { name: /load questions/i }))

  await waitFor(() => expect(getEmployerPack).toHaveBeenCalledWith("amazon-aws"))
  // Both questions land in the editor, editable.
  expect(
    await screen.findByDisplayValue(/took responsibility outside your remit/i),
  ).toBeInTheDocument()
  expect(screen.getByDisplayValue(/data contradicted what the team believed/i)).toBeInTheDocument()
  // Theme := the competency, so the write-up groups the way the framework does.
  expect(screen.getByDisplayValue("Accountability & Ownership")).toBeInTheDocument()

  // The employer NAME rides the frame as `company` so the backend resolves
  // provenance for the session and the export.
  await user.click(screen.getByRole("button", { name: /start the interview/i }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalled())
  const frame = onConfirm.mock.calls[0][0]
  expect(frame.company).toBe("Amazon / AWS")
  expect(frame.mode).toBe("custom")
  expect(frame.questions).toHaveLength(2)
})

it("shows the framework and its provenance disclaimer", async () => {
  getEmployerPacks.mockResolvedValue(CATALOGUE)
  getEmployerPack.mockResolvedValue(PACK)
  const user = userEvent.setup()
  renderBuilder()

  await user.click(screen.getByRole("tab", { name: /employer framework/i }))
  const select = await screen.findByLabelText(/employer or sector/i)
  await waitFor(() => expect(screen.getByRole("option", { name: "Amazon / AWS" })).toBeInTheDocument())
  await user.selectOptions(select, "amazon-aws")
  await user.click(screen.getByRole("button", { name: /load questions/i }))

  expect(await screen.findByText(/16 Leadership Principles/)).toBeInTheDocument()
  expect(screen.getByText(/Bar Raiser/)).toBeInTheDocument()
  // The disclaimer is mandatory — it must never be an optional flourish.
  expect(screen.getByText(/Not Amazon's actual interview questions\./)).toBeInTheDocument()
})

it("offers the consulting sector pack (regression: it was unreachable)", async () => {
  getEmployerPacks.mockResolvedValue(CATALOGUE)
  const user = userEvent.setup()
  renderBuilder()

  await user.click(screen.getByRole("tab", { name: /employer framework/i }))
  await screen.findByLabelText(/employer or sector/i)
  await waitFor(() =>
    expect(screen.getByRole("option", { name: "Management & Strategy Consulting" })).toBeInTheDocument(),
  )
  expect(screen.getByRole("option", { name: "McKinsey & Company" })).toBeInTheDocument()
})

it("degrades gracefully when the catalogue cannot be loaded", async () => {
  getEmployerPacks.mockRejectedValue(new Error("network"))
  const user = userEvent.setup()
  renderBuilder()

  await user.click(screen.getByRole("tab", { name: /employer framework/i }))
  expect(
    await screen.findByText(/catalogue could not be loaded/i),
  ).toBeInTheDocument()
  // The interview is never blocked by a missing pack.
  expect(screen.queryByLabelText(/employer or sector/i)).not.toBeInTheDocument()
})
