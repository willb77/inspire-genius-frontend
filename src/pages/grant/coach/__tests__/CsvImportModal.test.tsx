/**
 * @jest-environment jsdom
 *
 * Coach CSV import — parser handles quoted fields with embedded commas, and the
 * modal renders a preview of the parsed rows.
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── Mocks ── */
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/hooks/grant/mocks", () => ({
  ...jest.requireActual("@/hooks/grant/mocks"),
  USE_GRANT_MOCKS: true,
}))

import { parseCsv, parseCsvToRows } from "../csv"
import { CsvImportModal } from "../CsvImportModal"

describe("CSV parser", () => {
  test("parses a quoted field containing a comma", () => {
    const csv =
      'first_name,last_name,intended_field\n' +
      'Jamie,Doe,"Nursing, RN track"\n'
    const matrix = parseCsv(csv)
    // Header + one data row, and the quoted field is a single cell.
    expect(matrix).toHaveLength(2)
    expect(matrix[1]).toEqual(["Jamie", "Doe", "Nursing, RN track"])

    const rows = parseCsvToRows(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].first_name).toBe("Jamie")
    expect(rows[0].intended_field).toBe("Nursing, RN track")
  })

  test("omits blank cells and skips fully-empty lines", () => {
    const csv = "first_name,last_name,email\nAlex,,\n\n"
    const rows = parseCsvToRows(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].first_name).toBe("Alex")
    expect(rows[0].last_name).toBeUndefined()
    expect(rows[0].email).toBeUndefined()
  })
})

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CsvImportModal open onOpenChange={jest.fn()} />
    </QueryClientProvider>
  )
}

describe("CsvImportModal", () => {
  test("parses an uploaded CSV and shows the preview", async () => {
    renderModal()
    expect(screen.getByRole("heading", { name: /Import students from CSV/i })).toBeInTheDocument()

    const csv =
      'first_name,last_name,email,state,grade_level\n' +
      'Maria,Gonzalez,maria@example.edu,CA,12\n' +
      'Devon,Carter,,TX,11\n'

    const file = new File([csv], "roster.csv", { type: "text/csv" })
    // Guarantee Blob.text() resolves regardless of jsdom version.
    Object.defineProperty(file, "text", { value: () => Promise.resolve(csv) })

    const input = screen.getByLabelText("CSV file")
    fireEvent.change(input, { target: { files: [file] } })

    // Preview renders the parsed students.
    expect(await screen.findByText(/Preview — 2 students/i)).toBeInTheDocument()
    expect(screen.getByText("Maria")).toBeInTheDocument()
    expect(screen.getByText("Devon")).toBeInTheDocument()
    expect(screen.getByText("maria@example.edu")).toBeInTheDocument()
  })
})
