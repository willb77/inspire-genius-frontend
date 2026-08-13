/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
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
}))

describe("ReplacePrismDataButton", () => {
  beforeEach(() => mutate.mockReset())

  it("opens a dialog and requires a CSV before submit is enabled", () => {
    render(<ReplacePrismDataButton />)
    fireEvent.click(screen.getByTestId("prism-replace-open"))
    expect(screen.getByTestId("dialog")).toBeInTheDocument()
    // submit disabled with no CSV
    expect(screen.getByTestId("prism-replace-submit")).toBeDisabled()
  })

  it("submits the CSV (and optional PDF) to the replace hook", () => {
    render(<ReplacePrismDataButton />)
    fireEvent.click(screen.getByTestId("prism-replace-open"))

    const csv = new File(["raw"], "scores.csv", { type: "text/csv" })
    fireEvent.change(screen.getByTestId("prism-replace-csv"), {
      target: { files: [csv] },
    })
    const submit = screen.getByTestId("prism-replace-submit")
    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({ csv, pdf: null })
  })
})
