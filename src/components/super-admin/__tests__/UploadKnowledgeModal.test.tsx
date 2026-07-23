import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import UploadKnowledgeModal from "../UploadKnowledgeModal"

const mutate = jest.fn()
jest.mock("@/hooks/super-admin/knowledge/useKnowledge", () => ({
  useUploadKnowledge: () => ({ mutate, isPending: false }),
}))
const mutateAsync = jest.fn().mockResolvedValue({})
jest.mock("@/hooks/documents/useDocumentUpload", () => ({
  useDocumentUpload: () => ({ mutateAsync, isPending: false }),
}))

describe("UploadKnowledgeModal — standard-path shared file upload", () => {
  beforeEach(() => {
    mutate.mockClear()
    mutateAsync.mockClear()
  })

  it("routes a selected file through the standard pipeline as a shared KB doc", async () => {
    render(<UploadKnowledgeModal open onOpenChange={() => {}} />)

    const input = screen.getByLabelText(/choose a knowledge document/i) as HTMLInputElement
    const file = new File(["hi"], "handbook.pdf", { type: "application/pdf" })
    fireEvent.change(input, { target: { files: [file] } })

    fireEvent.click(screen.getByRole("button", { name: /upload to knowledge base/i }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ file, docKind: "knowledge_base", shared: true }),
      ),
    )
    // The bespoke text-ingest path is NOT used when a file is selected.
    expect(mutate).not.toHaveBeenCalled()
  })

  it("falls back to text ingest when no file is chosen", async () => {
    render(<UploadKnowledgeModal open onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "PRISM Gold" } })
    fireEvent.change(screen.getByLabelText(/paste content/i), {
      target: { value: "Some knowledge text" },
    })
    fireEvent.click(screen.getByRole("button", { name: /upload & vectorize/i }))

    await waitFor(() => expect(mutate).toHaveBeenCalled())
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
