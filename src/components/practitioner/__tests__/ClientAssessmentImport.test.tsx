/**
 * @jest-environment jsdom
 *
 * TDS A4 — a practitioner sends a client's DISC or CliftonStrengths result.
 * These tests try to disprove that: nothing is read without an assessment and
 * a file; nothing is sent without a review; the sent state says the client
 * has to accept it; and every refusal (unlinked client 409, no access 403, a
 * file that cannot be read) is shown, in the server's words when it sends
 * them.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import ClientAssessmentImport from "@/components/practitioner/ClientAssessmentImport"
import { importFailure } from "@/components/practitioner/clientImportHelpers"
import {
  previewClientAssessmentImport,
  sendClientAssessmentImport,
} from "@/services/practitioner/coachClient.service"

jest.mock("@/services/practitioner/coachClient.service", () => ({
  previewClientAssessmentImport: jest.fn(),
  sendClientAssessmentImport: jest.fn(),
  clientImportAvailable: true,
}))

const httpError = (status: number, detail?: string) => ({ response: { status, data: detail ? { detail } : {} } })

const DISC_ROWS = [
  { category: "DISC", dimension: "D", score_numeric: 70 },
  { category: "DISC", dimension: "I", score_numeric: 40 },
]

function renderIt() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ClientAssessmentImport clientId="cl-1" clientName="Marcus Chen" />
    </QueryClientProvider>,
  )
}

function openAndChoose(framework: "DISC" | "CLIFTON" | "", withFile = true) {
  fireEvent.click(screen.getByRole("button", { name: "Import DISC or CliftonStrengths" }))
  const dialog = screen.getByTestId("client-import-dialog")
  if (framework) fireEvent.change(within(dialog).getByLabelText("Assessment"), { target: { value: framework } })
  const file = new File(["x"], "report.csv", { type: "text/csv" })
  if (withFile) fireEvent.change(within(dialog).getByLabelText("File"), { target: { files: [file] } })
  return { dialog, file }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(previewClientAssessmentImport as jest.Mock).mockResolvedValue({ framework: "DISC", filename: "report.csv", scores: DISC_ROWS })
  ;(sendClientAssessmentImport as jest.Mock).mockResolvedValue({ assessmentId: "a1", framework: "DISC", state: "sent", scoreCount: 2 })
})

it("says up front that the result counts only after the client accepts it", () => {
  renderIt()
  expect(screen.getByText(/It counts only after Marcus Chen accepts it in their InspiresGenius Settings/)).toBeInTheDocument()
})

it("Read file stays off until an assessment and a file are chosen", () => {
  renderIt()
  const { dialog } = openAndChoose("", true)
  expect(within(dialog).getByRole("button", { name: "Read file" })).toBeDisabled()
  fireEvent.change(within(dialog).getByLabelText("Assessment"), { target: { value: "DISC" } })
  expect(within(dialog).getByRole("button", { name: "Read file" })).toBeEnabled()
})

it("offers DISC and CliftonStrengths only", () => {
  renderIt()
  const { dialog } = openAndChoose("")
  const options = within(within(dialog).getByLabelText("Assessment")).getAllByRole("option").map((o) => o.getAttribute("value"))
  expect(options).toEqual(["", "DISC", "CLIFTON"])
})

it("reads for THIS client, reviews, sends the reviewed rows, and says the client has to accept", async () => {
  renderIt()
  const { dialog, file } = openAndChoose("DISC")
  fireEvent.click(within(dialog).getByRole("button", { name: "Read file" }))
  await waitFor(() =>
    expect(previewClientAssessmentImport).toHaveBeenCalledWith("cl-1", "DISC", file),
  )
  const review = await screen.findByTestId("client-import-review")
  expect(review).toHaveTextContent("D")
  expect(sendClientAssessmentImport).not.toHaveBeenCalled()

  // Drop the misread "I" row, then send.
  fireEvent.click(within(review).getByRole("button", { name: "Remove I" }))
  fireEvent.click(screen.getByRole("button", { name: "Send to Marcus Chen" }))
  await waitFor(() =>
    expect(sendClientAssessmentImport).toHaveBeenCalledWith("cl-1", {
      framework: "DISC",
      scores: [{ category: "DISC", dimension: "D", score_numeric: 70 }],
    }),
  )
  const sent = await screen.findByTestId("client-import-sent")
  expect(sent).toHaveTextContent("It does not count until Marcus Chen accepts it in their InspiresGenius Settings")
  expect(sent).toHaveTextContent("can decline it")
})

it("an unlinked client (409): the server's words, verbatim, and nothing is sent", async () => {
  ;(previewClientAssessmentImport as jest.Mock).mockRejectedValue(
    httpError(409, "This client has not linked an InspiresGenius account yet"),
  )
  renderIt()
  const { dialog } = openAndChoose("DISC")
  fireEvent.click(within(dialog).getByRole("button", { name: "Read file" }))
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    /^This client has not linked an InspiresGenius account yet$/,
  )
  expect(sendClientAssessmentImport).not.toHaveBeenCalled()
  expect(screen.queryByTestId("client-import-review")).not.toBeInTheDocument()
})

it("a 409 at send is shown too, and the dialog does not claim it was sent", async () => {
  ;(sendClientAssessmentImport as jest.Mock).mockRejectedValue(
    httpError(409, "This client has not linked an InspiresGenius account yet"),
  )
  renderIt()
  const { dialog } = openAndChoose("DISC")
  fireEvent.click(within(dialog).getByRole("button", { name: "Read file" }))
  await screen.findByTestId("client-import-review")
  fireEvent.click(screen.getByRole("button", { name: "Send to Marcus Chen" }))
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "This client has not linked an InspiresGenius account yet",
  )
  expect(screen.queryByTestId("client-import-sent")).not.toBeInTheDocument()
})

it("no access to the client (403 with no words) says so plainly", async () => {
  ;(previewClientAssessmentImport as jest.Mock).mockRejectedValue(httpError(403))
  renderIt()
  const { dialog } = openAndChoose("DISC")
  fireEvent.click(within(dialog).getByRole("button", { name: "Read file" }))
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("You do not have access to this client.")
})

it("a file the server cannot read shows the server's reason", async () => {
  ;(previewClientAssessmentImport as jest.Mock).mockRejectedValue(
    httpError(400, "Unsupported file type — upload a CSV, XLSX, or PDF report"),
  )
  renderIt()
  const { dialog } = openAndChoose("DISC")
  fireEvent.click(within(dialog).getByRole("button", { name: "Read file" }))
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Unsupported file type — upload a CSV, XLSX, or PDF report",
  )
})

it("a CliftonStrengths theme that is not one of the 34 blocks Send until removed", async () => {
  ;(previewClientAssessmentImport as jest.Mock).mockResolvedValue({
    framework: "CLIFTON",
    scores: [
      { category: "Themes", dimension: "Achiever", score_text: "Achiever", rank: 1 },
      { category: "Themes", dimension: "Bananas", score_text: "Bananas", rank: 2 },
    ],
  })
  renderIt()
  const { dialog } = openAndChoose("CLIFTON")
  fireEvent.click(within(dialog).getByRole("button", { name: "Read file" }))
  const review = await screen.findByTestId("client-import-review")
  expect(review).toHaveTextContent("Not a CliftonStrengths theme")
  expect(screen.getByRole("button", { name: "Send to Marcus Chen" })).toBeDisabled()
  fireEvent.click(within(review).getByRole("button", { name: "Remove Bananas" }))
  expect(screen.getByRole("button", { name: "Send to Marcus Chen" })).toBeEnabled()
})

describe("importFailure", () => {
  it("prefers the server's words", () => {
    expect(importFailure(httpError(409, "x"))).toEqual({ kind: "detail", detail: "x" })
  })
  it("names 409, 403 and 413 without words", () => {
    expect(importFailure(httpError(409)).kind).toBe("notLinked")
    expect(importFailure(httpError(403)).kind).toBe("forbidden")
    expect(importFailure(httpError(413)).kind).toBe("tooLarge")
  })
  it("anything else is generic, including a detail that is not a string (a 422 list)", () => {
    expect(importFailure(new Error("net")).kind).toBe("generic")
    expect(importFailure({ response: { status: 422, data: { detail: [{ msg: "bad" }] } } }).kind).toBe("generic")
  })
})
