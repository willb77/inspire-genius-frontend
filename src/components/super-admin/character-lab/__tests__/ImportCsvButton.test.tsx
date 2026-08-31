import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ImportCsvButton from "../ImportCsvButton"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}))

const importMutate = jest.fn()
jest.mock("@/hooks/super-admin/useCharacterLab", () => ({
  useImportProfileCsv: () => ({ mutateAsync: importMutate, isPending: false }),
}))

function csvFile(name: string, body = "Candidate,Behavior Preferences\n") {
  const f = new File([body], name, { type: "text/csv" })
  // jsdom's File has no .text() in this environment.
  Object.defineProperty(f, "text", { value: () => Promise.resolve(body) })
  return f
}

function drop(...files: File[]) {
  const input = screen.getByLabelText(/Character CSV files/i)
  fireEvent.change(input, { target: { files } })
}

const result = (over: Record<string, unknown> = {}) => ({
  id: "p1", name: "Sonny Corleone", imported: 88, expected: 88, warnings: [], ...over,
})

beforeEach(() => jest.clearAllMocks())

it("sends the file's text and its filename", async () => {
  // The filename is the fallback when the file's own name cell still says
  // "Candidate", so it has to travel with the content.
  importMutate.mockResolvedValue(result())
  render(<ImportCsvButton />)
  drop(csvFile("csv_data_Sonny_Corleone.csv", "HEADER\nSonny"))

  await waitFor(() => expect(importMutate).toHaveBeenCalled())
  expect(importMutate).toHaveBeenCalledWith({
    content: "HEADER\nSonny",
    filename: "csv_data_Sonny_Corleone.csv",
  })
})

it("reports each file separately so a partial batch is legible", async () => {
  // "12 files imported" over 9 successes is exactly the dishonest summary this
  // surface exists to avoid.
  importMutate
    .mockResolvedValueOnce(result({ name: "Sonny Corleone" }))
    .mockRejectedValueOnce({ response: { data: { detail: "No scores could be read." } } })
    .mockResolvedValueOnce(result({ name: "Tom Hagen" }))

  render(<ImportCsvButton />)
  drop(csvFile("a.csv"), csvFile("b.csv"), csvFile("c.csv"))

  await waitFor(() => expect(importMutate).toHaveBeenCalledTimes(3))
  expect(await screen.findByText(/Sonny Corleone/)).toBeInTheDocument()
  expect(await screen.findByText(/No scores could be read/)).toBeInTheDocument()
  expect(await screen.findByText(/Tom Hagen/)).toBeInTheDocument()

  const { toast } = jest.requireMock("sonner") as { toast: { warning: jest.Mock } }
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("2 imported, 1 failed"))
})

it("says when a file imported only part of the profile", async () => {
  // A partial import is a success WITH A CAVEAT. Reporting only "imported"
  // would let 62 of 88 scales read as a complete character.
  importMutate.mockResolvedValue(
    result({ imported: 62, warnings: ["26 scale(s) had no column: Ambition, Resilience."] }),
  )
  render(<ImportCsvButton />)
  drop(csvFile("partial.csv"))

  expect(await screen.findByText(/62 of 88 scales/)).toBeInTheDocument()
  expect(await screen.findByText(/had no column/)).toBeInTheDocument()
})

it("does not crash on a 422, whose detail is an array of objects", async () => {
  importMutate.mockRejectedValue({
    response: {
      data: {
        detail: [{ type: "string_type", loc: ["body", "content"], msg: "Input should be a valid string" }],
      },
    },
  })
  render(<ImportCsvButton />)
  drop(csvFile("bad.csv"))

  expect(await screen.findByText(/content: Input should be a valid string/)).toBeInTheDocument()
})

it("clears the input so the same file can be re-imported after a correction", async () => {
  importMutate.mockResolvedValue(result())
  render(<ImportCsvButton />)
  const input = screen.getByLabelText(/Character CSV files/i) as HTMLInputElement
  drop(csvFile("a.csv"))
  await waitFor(() => expect(importMutate).toHaveBeenCalled())
  expect(input.value).toBe("")
})
