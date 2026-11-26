/**
 * @jest-environment jsdom
 *
 * TDS U12 (CSA #2210): a practitioner imports a linked client's PRISM report CSV.
 * The dialog discloses where the report goes, refuses non-CSV before an upload,
 * sends the page's client id with the file and nothing else, and shows every
 * server refusal in the server's own words.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import ClientPrismImport from "../ClientPrismImport"
import { isCsvFile, prismImportOffered } from "../clientPrismImportHelpers"
import { byText } from "@/test/byText"

const mockImport = jest.fn()
jest.mock("@/services/practitioner/coachClient.service", () => ({
  importClientPrismCsv: (...args: unknown[]) => mockImport(...args),
}))

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

function csv(name = "prism.csv") {
  return new File(["Dimension,Score\nGold,34\n"], name, { type: "text/csv" })
}

function httpError(status: number, detail: string) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { detail } },
  })
}

async function openAndPick(file: File) {
  const user = userEvent.setup({ applyAccept: false })
  await user.click(screen.getByRole("button", { name: byText("Import PRISM report (CSV)") }))
  const input = await screen.findByLabelText(/PRISM report \(CSV file\)/)
  await user.upload(input, file)
  return user
}

beforeEach(() => {
  mockImport.mockReset()
})

describe("prismImportOffered", () => {
  it("is offered only where the coach backend answered and the client is linked", () => {
    expect(prismImportOffered(null)).toBe(false)
    expect(prismImportOffered(undefined)).toBe(false)
    expect(prismImportOffered({ state: "not_linked", colours: null, assessedAt: null })).toBe(false)
    expect(prismImportOffered({ state: "not_shared", colours: null, assessedAt: null })).toBe(true)
    expect(prismImportOffered({ state: "no_prism", colours: null, assessedAt: null })).toBe(true)
    expect(prismImportOffered({ state: "shared", colours: {}, assessedAt: null })).toBe(true)
  })
})

describe("isCsvFile", () => {
  it("accepts .csv in any case and nothing else", () => {
    expect(isCsvFile(csv("a.csv"))).toBe(true)
    expect(isCsvFile(csv("A.CSV"))).toBe(true)
    expect(isCsvFile(csv("report.xlsx"))).toBe(false)
    expect(isCsvFile(csv("report.pdf"))).toBe(false)
    expect(isCsvFile(csv("csv"))).toBe(false)
  })
})

describe("ClientPrismImport", () => {
  it("says before sending that the report goes onto the client's own profile", async () => {
    wrap(<ClientPrismImport clientId="cl-1" clientName="Marcus Chen" />)
    await userEvent.click(screen.getByRole("button", { name: byText("Import PRISM report (CSV)") }))
    expect(
      await screen.findByText(byText(/Marcus Chen’s own InspiresGenius profile, where it becomes their current PRISM/)),
    ).toBeInTheDocument()
    expect(screen.getByText(byText(/Only a CSV file can be imported/))).toBeInTheDocument()
  })

  it("refuses a non-CSV file before any upload", async () => {
    wrap(<ClientPrismImport clientId="cl-1" clientName="Marcus Chen" />)
    const user = await openAndPick(csv("report.xlsx"))
    await user.click(screen.getByRole("button", { name: "Import" }))
    expect(screen.getByRole("alert")).toHaveTextContent("A PRISM report imports as a CSV file only")
    expect(mockImport).not.toHaveBeenCalled()
  })

  it("asks for a file when none is chosen", async () => {
    wrap(<ClientPrismImport clientId="cl-1" clientName="Marcus Chen" />)
    await userEvent.click(screen.getByRole("button", { name: byText("Import PRISM report (CSV)") }))
    await userEvent.click(await screen.findByRole("button", { name: "Import" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Choose the client’s PRISM report CSV first.")
    expect(mockImport).not.toHaveBeenCalled()
  })

  it("sends the page's client id and the file, then says where it went", async () => {
    mockImport.mockResolvedValueOnce({ assessmentId: "a-1", scoreCount: 40, typingCount: 2 })
    wrap(<ClientPrismImport clientId="cl-1" clientName="Marcus Chen" />)
    const file = csv()
    const user = await openAndPick(file)
    await user.click(screen.getByRole("button", { name: "Import" }))
    await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1))
    expect(mockImport).toHaveBeenCalledWith("cl-1", file)
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Imported. This PRISM report is now on Marcus Chen’s InspiresGenius profile as their current PRISM.",
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it.each([
    [409, "This client has not linked an InspiresGenius account yet"],
    [409, "This CSV (sha256=abcdef123456...) has already been imported for this person."],
    [403, "No access to this client"],
    [422, "CSV parse failed: missing dimension row"],
  ])("shows a %i refusal in the server's own words", async (status, detail) => {
    mockImport.mockRejectedValueOnce(httpError(status, detail))
    wrap(<ClientPrismImport clientId="cl-1" clientName="Marcus Chen" />)
    const user = await openAndPick(csv())
    await user.click(screen.getByRole("button", { name: "Import" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(detail)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    // The dialog stays open, so the practitioner sees the reason where they acted.
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("says nothing was added when the server gives no reason", async () => {
    mockImport.mockRejectedValueOnce({})
    wrap(<ClientPrismImport clientId="cl-1" clientName="Marcus Chen" />)
    const user = await openAndPick(csv())
    await user.click(screen.getByRole("button", { name: "Import" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The import failed. Nothing was added to Marcus Chen’s profile.",
    )
  })
})
