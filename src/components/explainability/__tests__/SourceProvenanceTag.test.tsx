/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import { SourceProvenanceTag } from "../SourceProvenanceTag"

describe("SourceProvenanceTag", () => {
  it("renders the filename and similarity percent", () => {
    render(
      <SourceProvenanceTag
        source={{
          document_id: "doc-1",
          filename: "Tracy_PRISM_profile.pdf",
          similarity: 0.92,
          scope: "personal",
        }}
      />
    )
    expect(screen.getByText("Tracy_PRISM_profile.pdf")).toBeInTheDocument()
    expect(screen.getByText(/92%/)).toBeInTheDocument()
  })

  it("falls back to the document_id when no filename exists", () => {
    render(<SourceProvenanceTag source={{ document_id: "doc-7" }} />)
    expect(screen.getByText("doc-7")).toBeInTheDocument()
  })
})
