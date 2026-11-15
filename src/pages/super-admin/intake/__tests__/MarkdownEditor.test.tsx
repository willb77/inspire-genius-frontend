import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MarkdownEditor } from "../MarkdownEditor"

// jsdom has no layout; ProseMirror asks for it on a click.
beforeAll(() => {
  document.elementFromPoint = () => null
  const rangeProto = Range.prototype as unknown as Record<string, unknown>
  rangeProto.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] })
  rangeProto.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) })
})

describe("MarkdownEditor", () => {
  it("renders existing Markdown as formatted content", async () => {
    render(<MarkdownEditor id="d" value={"**Bold** text\n\n- a\n- b"} onChange={() => {}} />)
    const box = await screen.findByRole("textbox", { name: "Public description" })
    expect(box.querySelector("strong")).toHaveTextContent("Bold")
    expect(box.querySelectorAll("li")).toHaveLength(2)
  })

  it("emits Markdown, not HTML, when text is typed", async () => {
    const onChange = jest.fn()
    render(<MarkdownEditor id="d" value="" onChange={onChange} />)
    const box = await screen.findByRole("textbox", { name: "Public description" })
    await userEvent.click(box)
    await userEvent.type(box, "hello <b>x</b>")
    const last = onChange.mock.calls.at(-1)?.[0] as string
    expect(last).toContain("hello")
    expect(last).not.toMatch(/<b>/)
  })

  it("offers no heading, code or image controls", async () => {
    render(<MarkdownEditor id="d" value="" onChange={() => {}} />)
    await screen.findByRole("toolbar", { name: "Formatting" })
    for (const name of ["Bold", "Italic", "Bulleted list", "Numbered list", "Link"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument()
    }
    expect(screen.queryByRole("button", { name: /heading|code|image/i })).toBeNull()
  })
})
