import fs from "fs"
import path from "path"
import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PrismCsvConverter from "../PrismCsvConverter"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

const toastError = jest.fn()
const toastSuccess = jest.fn()
jest.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } }))

const SAMPLE = fs.readFileSync(
  path.join(__dirname, "../../../lib/prism/__tests__/fixtures/long_form_sample.csv"),
  "utf8",
)

/** jsdom's File.text() is not implemented in every version. */
function csvFile(body: string, name = "long.csv") {
  const f = new File([body], name, { type: "text/csv" })
  Object.defineProperty(f, "text", { value: () => Promise.resolve(body) })
  return f
}

beforeEach(() => {
  toastError.mockClear()
  toastSuccess.mockClear()
})

describe("PrismCsvConverter", () => {
  it("renders inside the super-admin layout", () => {
    render(<PrismCsvConverter />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /PRISM CSV Converter/i })).toBeInTheDocument()
  })

  it("shows no result until a file is chosen", () => {
    render(<PrismCsvConverter />)
    expect(screen.queryByRole("button", { name: /Download standard CSV/i })).not.toBeInTheDocument()
  })

  it("converts a long-format export and reports the candidate", async () => {
    render(<PrismCsvConverter />)
    await userEvent.upload(screen.getByLabelText(/Long-format PRISM CSV/i), csvFile(SAMPLE))
    expect(await screen.findByText("Test Subject")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Download standard CSV/i })).toBeInTheDocument()
    expect(toastSuccess).toHaveBeenCalled()
  })

  it("states how many cells merely repeat the Underlying score", async () => {
    render(<PrismCsvConverter />)
    await userEvent.upload(screen.getByLabelText(/Long-format PRISM CSV/i), csvFile(SAMPLE))
    expect(
      await screen.findByText(/cells repeat the Underlying score/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/PRISM Career Development Analysis/)).toBeInTheDocument()
  })

  it("names the column the source could not supply", async () => {
    render(<PrismCsvConverter />)
    await userEvent.upload(screen.getByLabelText(/Long-format PRISM CSV/i), csvFile(SAMPLE))
    expect(await screen.findByText(/Core Traits \/ Skew/)).toBeInTheDocument()
  })

  it("reports a readable error for a file that is not a long-format export", async () => {
    render(<PrismCsvConverter />)
    await userEvent.upload(screen.getByLabelText(/Long-format PRISM CSV/i), csvFile("a,b\n1,2"))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastError.mock.calls[0][0]).toMatch(/long-format PRISM export/i)
    expect(screen.queryByRole("button", { name: /Download standard CSV/i })).not.toBeInTheDocument()
  })

  it("writes a real CSV on download, named after the candidate", async () => {
    // The download is the entire point of the page; asserting the button exists
    // would pass even if it produced nothing.
    let body = ""
    let filename = ""
    const RealBlob = global.Blob
    // capture what the page actually puts in the file
    global.Blob = class extends RealBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts)
        body = parts.join("")
      }
    } as unknown as typeof Blob
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = jest.fn(() => "blob:x")
    URL.revokeObjectURL = jest.fn()
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        filename = this.download
      })

    render(<PrismCsvConverter />)
    await userEvent.upload(screen.getByLabelText(/Long-format PRISM CSV/i), csvFile(SAMPLE))
    await userEvent.click(await screen.findByRole("button", { name: /Download standard CSV/i }))

    expect(click).toHaveBeenCalled()
    expect(filename).toBe("Test_Subject_PRISM_scores_standard.csv")
    const lines = body.replace(/^\uFEFF/, "").split("\r\n")
    expect(lines).toHaveLength(5)
    expect(lines[0].startsWith("Candidate,Behavior Preferences")).toBe(true)
    expect(lines[1].startsWith("Test Subject,Innovating")).toBe(true)
    expect(lines[2].startsWith("Underlying,")).toBe(true)
    expect(lines[2].split(",").length).toBeGreaterThan(90)

    click.mockRestore()
    global.Blob = RealBlob
    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
  })
})
