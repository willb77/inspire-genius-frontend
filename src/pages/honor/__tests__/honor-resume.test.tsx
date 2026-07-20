/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { HonorFellow, HonorResume as HonorResumeData } from "@/types/honor"

/* ── mocks ── */
const generateResume = jest.fn()
const recordReportExport = jest.fn()
const emailReport = jest.fn()
jest.mock("@/services/honor/coach.service", () => ({
  generateResume: (...a: unknown[]) => generateResume(...a),
  recordReportExport: (...a: unknown[]) => recordReportExport(...a),
  emailReport: (...a: unknown[]) => emailReport(...a),
}))

const useCaseload = jest.fn()
const useCoachHome = jest.fn()
jest.mock("@/hooks/honor/useCoachData", () => ({
  useCaseload: () => useCaseload(),
  useCoachHome: () => useCoachHome(),
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { fullName: "S. Carter", email: "coach@honor.org" } }),
}))

const renderHonorResumePdf = jest.fn()
jest.mock("@/lib/honor/exportHonorResume", () => ({
  renderHonorResumePdf: (...a: unknown[]) => renderHonorResumePdf(...a),
}))

const downloadBlob = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: (...a: unknown[]) => downloadBlob(...a) }))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import HonorResume from "../HonorResume"

function fellow(id: string, first: string, last: string): HonorFellow {
  return {
    id, firstName: first, lastName: last, email: `${first}@honor.org`,
    background: "Naval Special Warfare", target: "Program Management",
    prism: null, disc: null, cliftonStrengths: [], status: "assessed", cohort: "2026", docs: [],
  }
}
const FELLOWS = [fellow("f1", "Marcus", "Reyes")]

function resumeFixture(): HonorResumeData {
  return {
    fellow_id: "f1",
    target: "Program Manager",
    headline: "Operations & Program Management Leader",
    summary: "Disciplined operations leader translating elite team leadership to industry.",
    competencies: ["Program management", "Risk decisions"],
    experience: [
      { title: "Operations Team Lead", organization: "U.S. Navy", dates: "2016–2024", bullets: ["Led a 12-person team."] },
    ],
    education: ["B.S., Organizational Leadership"],
    certifications: ["PMP (in progress)"],
    frameworks: ["PRISM"],
    sources: ["Fellow's résumé", "PRISM"],
    grounded: true,
    disclaimer: "Coach must review before use.",
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/vertical/honor/resume"]}>
        <HonorResume />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useCaseload.mockReturnValue({ data: FELLOWS })
  useCoachHome.mockReturnValue({ data: { coachName: "S. Carter", coachTitle: "Transition Mentor" } })
  generateResume.mockResolvedValue({ status: true, data: resumeFixture() })
  recordReportExport.mockResolvedValue({ status: true, data: { recorded: true } })
  renderHonorResumePdf.mockResolvedValue({ fileName: "honor-resume-marcus-reyes.pdf", blob: new Blob(["pdf"]) })
})

test("selecting a fellow + Generate renders the structured résumé", async () => {
  renderPage()
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "f1" } })
  fireEvent.change(screen.getByPlaceholderText(/Program Manager/i), { target: { value: "Program Manager" } })
  fireEvent.click(screen.getByRole("button", { name: /generate résumé/i }))

  await waitFor(() => expect(generateResume).toHaveBeenCalledTimes(1))
  expect(generateResume).toHaveBeenCalledWith("f1", expect.objectContaining({ role: "Program Manager" }))
  expect(await screen.findByText("Operations & Program Management Leader")).toBeInTheDocument()
  expect(screen.getByText("Operations Team Lead")).toBeInTheDocument()
  expect(screen.getByText(/Target — Program Manager/i)).toBeInTheDocument()
})

test("when the server flag is off, shows an honest not-enabled message (no fabricated sample)", async () => {
  generateResume.mockResolvedValue({ status: true, data: { disabled: true } })
  renderPage()
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "f1" } })
  fireEvent.click(screen.getByRole("button", { name: /generate résumé/i }))

  await waitFor(() => expect(generateResume).toHaveBeenCalled())
  // Honest empty state — NOT a fake sample résumé.
  expect(await screen.findByText(/isn’t enabled in this environment yet/i)).toBeInTheDocument()
  expect(screen.queryByText("Operations & Program Management Leader")).not.toBeInTheDocument()
})

test("Download renders the branded résumé PDF and audits a real draft as kind=resume", async () => {
  renderPage()
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "f1" } })
  fireEvent.click(screen.getByRole("button", { name: /generate résumé/i }))
  await screen.findByText("Operations & Program Management Leader")

  fireEvent.click(screen.getByRole("button", { name: /download pdf/i }))
  await waitFor(() => expect(renderHonorResumePdf).toHaveBeenCalledTimes(1))
  expect(renderHonorResumePdf).toHaveBeenCalledWith(
    expect.objectContaining({ headline: "Operations & Program Management Leader" }),
    expect.objectContaining({ fellowName: "Marcus Reyes", coachName: "S. Carter" }),
  )
  await waitFor(() =>
    expect(downloadBlob).toHaveBeenCalledWith("honor-resume-marcus-reyes.pdf", expect.any(Blob)),
  )
  await waitFor(() =>
    expect(recordReportExport).toHaveBeenCalledWith("f1", { kind: "resume", action: "download" }),
  )
})

test("when generation is disabled, no résumé (and no Download) is shown", async () => {
  generateResume.mockResolvedValue({ status: true, data: { disabled: true } })
  renderPage()
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "f1" } })
  fireEvent.click(screen.getByRole("button", { name: /generate résumé/i }))
  await screen.findByText(/isn’t enabled in this environment yet/i)

  // No fabricated résumé → nothing to download → nothing to audit.
  expect(screen.queryByRole("button", { name: /download pdf/i })).not.toBeInTheDocument()
  expect(renderHonorResumePdf).not.toHaveBeenCalled()
  expect(recordReportExport).not.toHaveBeenCalled()
})

test("email button is hidden while USE_HONOR_REPORT_EMAIL is off", async () => {
  renderPage()
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "f1" } })
  fireEvent.click(screen.getByRole("button", { name: /generate résumé/i }))
  await screen.findByText("Operations & Program Management Leader")
  expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /email to fellow/i })).not.toBeInTheDocument()
})
