/**
 * A `getByText` matcher that reads an element's text the way a person does: its own
 * text plus any `<em>` inside it. PRISM is italic (`<Prism />` renders `<em>PRISM</em>`),
 * so `getByText("PRISM Report")` no longer finds `<h2>PRISM Report</h2>`: the heading's
 * own text node is only " Report". Use `getByText(byText("PRISM Report"))`.
 *
 * Only `<em>` children count, so an ancestor does not also match.
 */
export function byText(expected: string | RegExp): (content: string, element: Element | null) => boolean {
  return (_content, element) => {
    if (!element) return false
    const own = Array.from(element.childNodes)
      .map((n) => (n.nodeType === 3 || (n as Element).tagName === "EM" ? (n.textContent ?? "") : ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim()
    return typeof expected === "string" ? own === expected : expected.test(own)
  }
}
