/**
 * @jest-environment jsdom
 *
 * The TDS Meridian tile's Export menu: each item calls its exporter with the
 * conversation on screen, the member-data notice is shown, and the trigger is
 * disabled while there is nothing to export.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

/* Radix DropdownMenu portals don't render in jsdom — mock it so the content and
   items render synchronously, bridging `onSelect` to a click. */
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children, ...rest }: { children: React.ReactNode; "data-testid"?: string }) => (
    <div data-testid={rest["data-testid"]}>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...rest
  }: {
    children: React.ReactNode
    onSelect?: () => void
    "data-testid"?: string
  }) => (
    <div role="menuitem" data-testid={rest["data-testid"]} onClick={() => onSelect?.()}>
      {children}
    </div>
  ),
}))

const toastSuccess = jest.fn()
const toastError = jest.fn()
jest.mock("sonner", () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}))

const mockWord = jest.fn()
const mockPdf = jest.fn()
const mockExcel = jest.fn()
const mockPrint = jest.fn()
const mockEmail = jest.fn()
jest.mock("@/lib/exportDevelopmentChat", () => ({
  developmentNotice: (name: string) => `Contains ${name}'s development information — share only with people entitled to see it.`,
  exportDevelopmentChatWord: (p: unknown) => mockWord(p),
  exportDevelopmentChatPdf: (p: unknown) => mockPdf(p),
  exportDevelopmentChatExcel: (p: unknown) => mockExcel(p),
  printDevelopmentChat: (p: unknown) => mockPrint(p),
  emailDevelopmentChat: (p: unknown) => mockEmail(p),
}))

import { MeridianExportMenu } from "../MeridianExportMenu"

const TURNS = [
  { role: "user" as const, content: "Q" },
  { role: "assistant" as const, content: "A" },
]

function renderMenu(turns = TURNS) {
  return render(<MeridianExportMenu memberName="Ben B" managerName="Dana" turns={turns} />)
}

beforeEach(() => {
  jest.clearAllMocks()
})

it("renders the trigger and the member-data notice", () => {
  renderMenu()
  expect(screen.getByTestId("meridian-export-trigger")).toBeEnabled()
  expect(screen.getByTestId("meridian-export-notice")).toHaveTextContent(
    "Contains Ben B's development information — share only with people entitled to see it.",
  )
})

it("disables the trigger when the conversation is empty", () => {
  renderMenu([])
  expect(screen.getByTestId("meridian-export-trigger")).toBeDisabled()
})

it.each([
  ["meridian-export-word", mockWord],
  ["meridian-export-pdf", mockPdf],
  ["meridian-export-excel", mockExcel],
  ["meridian-export-print", mockPrint],
  ["meridian-export-email", mockEmail],
])("%s calls only its exporter, with the on-screen conversation", async (testId, fn) => {
  renderMenu()
  fireEvent.click(screen.getByTestId(testId))
  await waitFor(() => expect(fn).toHaveBeenCalledTimes(1))
  expect(fn).toHaveBeenCalledWith(
    expect.objectContaining({ memberName: "Ben B", managerName: "Dana", turns: TURNS, generatedAt: expect.any(Date) }),
  )
  const all = [mockWord, mockPdf, mockExcel, mockPrint, mockEmail]
  expect(all.filter((m) => m.mock.calls.length > 0)).toHaveLength(1)
})

it("reports a failed export instead of failing silently", async () => {
  mockPdf.mockRejectedValueOnce(new Error("boom"))
  renderMenu()
  fireEvent.click(screen.getByTestId("meridian-export-pdf"))
  await waitFor(() => expect(toastError).toHaveBeenCalled())
  expect(toastSuccess).not.toHaveBeenCalled()
})
