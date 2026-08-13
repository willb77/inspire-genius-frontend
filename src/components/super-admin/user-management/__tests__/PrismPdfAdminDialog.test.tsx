/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import PrismPdfAdminDialog from "../PrismPdfAdminDialog"

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const upload = jest.fn()
const del = jest.fn()
jest.mock("@/hooks/prism/usePrismReportDownload", () => ({
  useAdminUploadPrismPdf: () => ({ mutate: upload, isPending: false }),
  useAdminDeletePrismPdf: () => ({ mutate: del, isPending: false }),
}))

const target = { id: "u1", email: "a@b.com", name: "Ada" }

describe("PrismPdfAdminDialog", () => {
  beforeEach(() => {
    upload.mockReset()
    del.mockReset()
  })

  it("uploads a selected PDF for the target user", () => {
    render(<PrismPdfAdminDialog open onOpenChange={() => {}} target={target} />)
    const pdf = new File(["%PDF-1.7 x"], "r.pdf", { type: "application/pdf" })
    fireEvent.change(screen.getByTestId("admin-prism-pdf-file"), {
      target: { files: [pdf] },
    })
    fireEvent.click(screen.getByTestId("admin-prism-pdf-upload"))
    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload.mock.calls[0][0]).toEqual({ userId: "u1", pdf })
  })

  it("requires confirmation before deleting", () => {
    render(<PrismPdfAdminDialog open onOpenChange={() => {}} target={target} />)
    fireEvent.click(screen.getByTestId("admin-prism-pdf-delete"))
    // now a confirm button appears
    fireEvent.click(screen.getByTestId("admin-prism-pdf-delete-confirm"))
    expect(del).toHaveBeenCalledTimes(1)
    expect(del.mock.calls[0][0]).toEqual({ userId: "u1" })
  })
})
