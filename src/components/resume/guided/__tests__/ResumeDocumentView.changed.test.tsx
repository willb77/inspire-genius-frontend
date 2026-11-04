/**
 * RWO-8 — the shared draft view's change marks. Today's page passes no `changed`,
 * so it must render exactly as before: no mark, and no extra element around a
 * paragraph. The guided review passes the new lines and only those are marked.
 */
import { render } from "@testing-library/react"
import "@testing-library/jest-dom"
import { ResumeDocumentView } from "@/components/resume/ResumeDocumentView"
import type { ResumeDocument } from "@/lib/resume/resumeDocument"

const DOC: ResumeDocument = {
  name: "Jordan Testcase",
  headline: "",
  contactLine: "",
  sections: [
    { key: "summary", heading: "Summary", blocks: [{ kind: "paragraph", text: "Runs teams." }] },
    { key: "competencies", heading: "Skills", blocks: [{ kind: "bullets", items: ["Planning", "Scheduling"] }] },
    {
      key: "experience",
      heading: "Experience",
      blocks: [{ kind: "entry", title: "Lead", subtitle: "Contoso", dates: "2019", bullets: ["Led 12", "Cut costs"] }],
    },
  ],
}

test("without a change set nothing is marked and a paragraph is plain text", () => {
  const { container } = render(<ResumeDocumentView doc={DOC} footnote="f" />)
  expect(container.querySelectorAll("[data-changed]")).toHaveLength(0)
  expect(container.querySelector("p.leading-relaxed")?.innerHTML).toBe("Runs teams.")
})

test("with a change set exactly those lines are marked, in every block kind", () => {
  const { container } = render(
    <ResumeDocumentView doc={DOC} footnote="f" changed={new Set(["Runs teams.", "Scheduling", "Cut costs"])} />,
  )
  const marked = [...container.querySelectorAll('[data-changed="true"]')].map((e) => e.textContent)
  expect(marked).toEqual(["Runs teams.", "Scheduling", "Cut costs"])
})
