/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PrismDataMenu } from "../PrismDataMenu"

/* Radix DropdownMenu portals don't render in jsdom — mock it so the content +
   items render synchronously. Bridge `onSelect` (what the component uses) to a
   click, honouring `disabled`. */
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button>{children}</button>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="menu-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    disabled,
    ...rest
  }: {
    children: React.ReactNode
    onSelect?: (e: { preventDefault: () => void }) => void
    disabled?: boolean
    "data-testid"?: string
  }) => (
    <div
      role="menuitem"
      aria-disabled={disabled}
      data-testid={rest["data-testid"]}
      onClick={() => {
        if (!disabled) onSelect?.({ preventDefault: () => {} })
      }}
    >
      {children}
    </div>
  ),
}))

jest.mock("@/components/prism/PrismSelfMapContent", () => ({
  PrismSelfMapContent: () => <div data-testid="self-map">map</div>,
}))

const toastError = jest.fn()
jest.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }))

const useMyPrismReport = jest.fn()
const mutateAsync = jest.fn()
jest.mock("@/hooks/prism/usePrismReportDownload", () => ({
  useMyPrismReport: () => useMyPrismReport(),
  useMyPrismReportDownloadUrl: () => ({ mutateAsync, isPending: false }),
}))

describe("PrismDataMenu", () => {
  beforeEach(() => {
    useMyPrismReport.mockReset()
    mutateAsync.mockReset()
    toastError.mockReset()
  })

  it("renders the 'Prism Data' trigger and both items", () => {
    useMyPrismReport.mockReturnValue({ data: { available: false } })
    render(<PrismDataMenu />)
    expect(screen.getByTestId("homev2-prism-data")).toHaveTextContent("Prism Data")
    expect(screen.getByTestId("homev2-prism-data-pdf")).toBeInTheDocument()
    expect(screen.getByTestId("homev2-prism-data-map")).toBeInTheDocument()
  })

  it("disables the PDF item and hints when no PDF is ingested yet", () => {
    useMyPrismReport.mockReturnValue({ data: { available: true, pdf_available: false } })
    render(<PrismDataMenu />)
    expect(screen.getByTestId("homev2-prism-data-pdf")).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByText(/your pdf isn't ready yet/i)).toBeInTheDocument()
  })

  it("opens the presigned PDF when available", async () => {
    useMyPrismReport.mockReturnValue({
      data: { available: true, pdf_available: true, request_id: "req-1" },
    })
    mutateAsync.mockResolvedValue({ url: "https://s3.example/report.pdf" })
    const win = { location: { href: "" }, close: jest.fn(), opener: {} as unknown }
    const openSpy = jest
      .spyOn(window, "open")
      .mockReturnValue(win as unknown as Window)

    render(<PrismDataMenu />)
    fireEvent.click(screen.getByTestId("homev2-prism-data-pdf"))

    // Request-independent: the resolver serves the caller's best PDF; no request id.
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ kind: "pdf" }),
    )
    await waitFor(() => expect(win.location.href).toBe("https://s3.example/report.pdf"))

    // The features argument is the whole bug: passing "noopener"/"noreferrer"
    // makes a real browser return null, so there is no handle to redirect and
    // the old code navigated the current tab instead. Verified in Chrome 150.
    // Mocking window.open cannot reproduce that, so pin the CALL SHAPE.
    expect(openSpy).toHaveBeenCalledWith("", "_blank")
    const feats = openSpy.mock.calls[0][2]
    expect(feats ?? "").not.toMatch(/noopener|noreferrer/)
    // opener must still be severed — same protection, without losing the handle.
    expect(win.opener).toBeNull()
    openSpy.mockRestore()
  })

  it("never navigates the current tab away from Home", async () => {
    // The regression that prompted this: a null handle fell through to
    // `window.location.href = url`, replacing HomeV2 with the PDF.
    useMyPrismReport.mockReturnValue({
      data: { available: true, pdf_available: true, request_id: "req-1" },
    })
    mutateAsync.mockResolvedValue({ url: "https://s3.example/report.pdf" })
    const openSpy = jest.spyOn(window, "open").mockReturnValue(null)
    const before = window.location.href

    render(<PrismDataMenu />)
    fireEvent.click(screen.getByTestId("homev2-prism-data-pdf"))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ kind: "pdf" }))
    expect(window.location.href).toBe(before)
    // ...and the user is offered a way through rather than left stuck.
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    const opts = toastError.mock.calls.at(-1)?.[1] as
      | { action?: { label?: string } }
      | undefined
    expect(opts?.action?.label).toBe("Open report")
    openSpy.mockRestore()
  })

  it("enables the PDF item when pdf_available even with NO request_id (William case)", async () => {
    // Scores on file / an uploaded report but no poll-ingest row → still openable.
    useMyPrismReport.mockReturnValue({
      data: { available: true, pdf_available: true, request_id: null },
    })
    mutateAsync.mockResolvedValue({ url: "https://s3.example/generated.pdf" })
    const win = { location: { href: "" }, close: jest.fn(), opener: {} as unknown }
    const openSpy = jest.spyOn(window, "open").mockReturnValue(win as unknown as Window)

    render(<PrismDataMenu />)
    const item = screen.getByTestId("homev2-prism-data-pdf")
    expect(item).toHaveAttribute("aria-disabled", "false")
    expect(screen.queryByText(/your pdf isn't ready yet/i)).not.toBeInTheDocument()

    fireEvent.click(item)
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ kind: "pdf" }))
    await waitFor(() => expect(win.location.href).toBe("https://s3.example/generated.pdf"))
    expect(openSpy).toHaveBeenCalledWith("", "_blank")
    openSpy.mockRestore()
  })

  it("opens the Brain Map dialog from the map item", () => {
    useMyPrismReport.mockReturnValue({ data: { available: true, pdf_available: true, request_id: "r" } })
    render(<PrismDataMenu />)
    fireEvent.click(screen.getByTestId("homev2-prism-data-map"))
    expect(screen.getByTestId("self-map")).toBeInTheDocument()
  })
})
