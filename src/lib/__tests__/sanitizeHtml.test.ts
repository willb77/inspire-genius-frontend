/**
 * @jest-environment jsdom
 */
import { sanitizeBodyHtml } from "@/lib/sanitizeHtml"

describe("sanitizeBodyHtml", () => {
  test("strips <script> tags", () => {
    const out = sanitizeBodyHtml('<p>Hi</p><script>alert(1)</script>')
    expect(out).toContain("<p>Hi</p>")
    expect(out.toLowerCase()).not.toContain("<script")
  })

  test("strips onerror / event-handler attributes", () => {
    const out = sanitizeBodyHtml('<img src="x" onerror="alert(1)">')
    expect(out.toLowerCase()).not.toContain("onerror")
  })

  test("removes inline event handlers on allowed tags", () => {
    const out = sanitizeBodyHtml('<a href="https://x.test" onclick="steal()">link</a>')
    expect(out).toContain("href")
    expect(out.toLowerCase()).not.toContain("onclick")
  })

  test("keeps allowed formatting tags", () => {
    const out = sanitizeBodyHtml("<h1>Title</h1><ul><li>one</li></ul><strong>bold</strong>")
    expect(out).toContain("<h1>Title</h1>")
    expect(out).toContain("<li>one</li>")
    expect(out).toContain("<strong>bold</strong>")
  })

  test("drops iframe/object embedding", () => {
    const out = sanitizeBodyHtml('<iframe src="evil"></iframe><p>ok</p>')
    expect(out.toLowerCase()).not.toContain("<iframe")
    expect(out).toContain("<p>ok</p>")
  })
})
