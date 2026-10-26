/**
 * @jest-environment jsdom
 */
import { act, render, screen, fireEvent } from "@testing-library/react"
import { ReplacePrismDataButton } from "../ReplacePrismDataButton"

// Radix Dialog portals don't render in jsdom — pass children through.
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mutate = jest.fn()
jest.mock("@/hooks/prism/usePrismReportDownload", () => ({
  useReplaceMyPrismReport: () => ({ mutate, isPending: false }),
  sectionLossOf: jest.requireActual("@/hooks/prism/usePrismReportDownload").sectionLossOf,
}))

let pdfOn = false
jest.mock("@/hooks/switches/usePrismPdfReplaceEnabled", () => ({
  usePrismPdfReplaceEnabled: () => pdfOn,
}))

const csvFile = () => new File(["raw"], "scores.csv", { type: "text/csv" })
const pdfFile = (size?: number) => {
  const f = new File(["%PDF-1.7"], "report.pdf", { type: "application/pdf" })
  if (size !== undefined) Object.defineProperty(f, "size", { value: size })
  return f
}

function open() {
  render(<ReplacePrismDataButton />)
  fireEvent.click(screen.getByTestId("prism-replace-open"))
}
const choose = (...files: File[]) =>
  fireEvent.change(screen.getByTestId("prism-drop-input"), { target: { files } })
const drop = (...files: File[]) =>
  fireEvent.drop(screen.getByTestId("prism-drop-zone"), { dataTransfer: { files } })

describe("ReplacePrismDataButton", () => {
  beforeEach(() => {
    mutate.mockReset()
    pdfOn = false
  })

  describe("switch OFF — today's behaviour", () => {
    it("opens a dialog and requires a CSV before submit is enabled", () => {
      open()
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
      expect(screen.getByTestId("prism-replace-submit")).toBeDisabled()
    })

    it("a PDF alone is not enough, and says so", () => {
      open()
      choose(pdfFile())
      expect(screen.getByTestId("prism-replace-submit")).toBeDisabled()
      expect(screen.getByTestId("prism-replace-needs-csv")).toBeInTheDocument()
    })

    it("submits the CSV (and optional PDF) to the replace hook", () => {
      open()
      const csv = csvFile()
      choose(csv)
      const submit = screen.getByTestId("prism-replace-submit")
      expect(submit).not.toBeDisabled()
      fireEvent.click(submit)
      expect(mutate).toHaveBeenCalledTimes(1)
      expect(mutate.mock.calls[0][0]).toEqual({ csv, pdf: null, confirmSectionLoss: false })
    })

    it("applies no new size caps", () => {
      open()
      choose(csvFile(), pdfFile(50 * 1024 * 1024))
      expect(screen.queryByTestId("prism-replace-oversize")).not.toBeInTheDocument()
      expect(screen.getByTestId("prism-replace-submit")).not.toBeDisabled()
    })
  })

  describe("drag and drop", () => {
    it("sorts dropped files into the PDF and CSV slots", () => {
      open()
      drop(pdfFile(), csvFile())
      expect(screen.getByTestId("prism-drop-pdf-file")).toHaveTextContent("report.pdf")
      expect(screen.getByTestId("prism-drop-csv-file")).toHaveTextContent("scores.csv")
      expect(screen.getByTestId("prism-replace-submit")).not.toBeDisabled()
    })

    it("refuses a file that is neither, out loud", () => {
      open()
      drop(new File(["x"], "report.docx"))
      expect(screen.getByTestId("prism-drop-refused")).toHaveTextContent("report.docx")
      expect(screen.queryByTestId("prism-drop-pdf-file")).not.toBeInTheDocument()
    })

    it("removes a chosen file", () => {
      open()
      drop(csvFile())
      fireEvent.click(screen.getByLabelText("Remove scores.csv"))
      expect(screen.queryByTestId("prism-drop-csv-file")).not.toBeInTheDocument()
      expect(screen.getByTestId("prism-replace-submit")).toBeDisabled()
    })
  })

  describe("switch ON — PDF replace", () => {
    beforeEach(() => {
      pdfOn = true
    })

    it("a PDF on its own can be submitted", () => {
      open()
      const pdf = pdfFile()
      drop(pdf)
      fireEvent.click(screen.getByTestId("prism-replace-submit"))
      expect(mutate.mock.calls[0][0]).toEqual({ csv: null, pdf, confirmSectionLoss: false })
    })

    it("refuses a PDF over 4 MB on its own before uploading", () => {
      open()
      drop(pdfFile(4 * 1024 * 1024 + 1))
      expect(screen.getByTestId("prism-replace-oversize")).toHaveTextContent(/4 MB/)
      expect(screen.getByTestId("prism-replace-submit")).toBeDisabled()
    })

    it("on a section-loss 409, lists the sections and resubmits only when confirmed", () => {
      open()
      const pdf = pdfFile()
      drop(pdf)
      fireEvent.click(screen.getByTestId("prism-replace-submit"))
      const [, opts] = mutate.mock.calls[0]
      act(() =>
        opts.onError(
          Object.assign(new Error("409"), {
            response: {
              status: 409,
              data: { detail: { code: "section_loss", sections: ["Emotional Intelligence", "Core Traits"], message: "m" } },
            },
          }),
        ),
      )
      expect(screen.getByTestId("prism-replace-section-loss")).toHaveTextContent(
        "Emotional Intelligence, Core Traits",
      )
      fireEvent.click(screen.getByTestId("prism-replace-confirm-loss"))
      expect(mutate).toHaveBeenCalledTimes(2)
      expect(mutate.mock.calls[1][0]).toEqual({ csv: null, pdf, confirmSectionLoss: true })
    })

    it("changing the files clears a pending section-loss question", () => {
      open()
      drop(pdfFile())
      fireEvent.click(screen.getByTestId("prism-replace-submit"))
      act(() =>
        mutate.mock.calls[0][1].onError(
          Object.assign(new Error("409"), {
            response: { status: 409, data: { detail: { code: "section_loss", sections: ["Big Five"] } } },
          }),
        ),
      )
      expect(screen.getByTestId("prism-replace-section-loss")).toBeInTheDocument()
      drop(csvFile())
      expect(screen.queryByTestId("prism-replace-section-loss")).not.toBeInTheDocument()
      expect(screen.getByTestId("prism-replace-submit")).toBeInTheDocument()
    })

    it("another error does not open the section-loss question", () => {
      open()
      drop(pdfFile())
      fireEvent.click(screen.getByTestId("prism-replace-submit"))
      act(() =>
        mutate.mock.calls[0][1].onError(
          Object.assign(new Error("502"), { response: { status: 502, data: { detail: { code: "converter_failed", message: "m" } } } }),
        ),
      )
      expect(screen.queryByTestId("prism-replace-section-loss")).not.toBeInTheDocument()
    })
  })
})
