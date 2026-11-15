import { render } from "@testing-library/react"
import { EventDescription } from "../EventDescription"

const html = (md: string) => render(<EventDescription markdown={md} />).container

describe("EventDescription", () => {
  it("renders what the editor emits: bold, italic, both list kinds, links", () => {
    const c = html("**b** and _i_ and *j*\n\n- one\n- two\n\n1. first\n2. second\n\n[site](https://ok.example)")
    expect(c.querySelector("strong")).toHaveTextContent("b")
    expect(c.querySelectorAll("em")).toHaveLength(2)
    expect(c.querySelectorAll("ul li")).toHaveLength(2)
    expect(c.querySelectorAll("ol li")).toHaveLength(2)
    expect(c.querySelector("a")).toHaveAttribute("href", "https://ok.example")
    expect(c.querySelector("a")).toHaveAttribute("rel", "noopener noreferrer nofollow")
  })

  it("merges a loose list into one list", () => {
    expect(html("- a\n\n- b\n\n- c").querySelectorAll("ul")).toHaveLength(1)
  })

  it("never turns raw HTML into elements", () => {
    const c = html('<img src=x onerror="alert(1)"><script>1</script><a href="https://evil.example">x</a>')
    expect(c.querySelector("img, script, a")).toBeNull()
    expect(c).toHaveTextContent("<script>1</script>")
  })

  it.each(["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "//evil.example", "/relative"])(
    "does not link %s",
    (url) => {
      const c = html(`[click](${url})`)
      expect(c.querySelector("a")).toBeNull()
      expect(c).toHaveTextContent("click")
    },
  )

  it("allows mailto", () => {
    expect(html("[me](mailto:a@b.example)").querySelector("a")).toHaveAttribute("href", "mailto:a@b.example")
  })

  it("shows escaped characters literally and keeps plain text with line breaks", () => {
    expect(html("2 \\* 3").textContent).toBe("2 * 3")
    expect(html("Line one\nLine two").textContent).toBe("Line one\nLine two")
  })

  it("renders nothing for an empty string", () => {
    expect(html("").querySelector("p, ul, ol")).toBeNull()
  })
})
