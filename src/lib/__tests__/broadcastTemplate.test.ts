import { buildBrandedHtml, SEVERITY_META } from "@/lib/broadcastTemplate"

describe("buildBrandedHtml", () => {
  test("includes the severity color and label", () => {
    const html = buildBrandedHtml("critical", "Outage", "<p>Down</p>")
    expect(html).toContain(SEVERITY_META.critical.color)
    expect(html).toContain("Critical")
  })

  test("embeds the sanitized body", () => {
    const html = buildBrandedHtml("info", "Notice", "<p>Hello world</p>")
    expect(html).toContain("<p>Hello world</p>")
  })

  test("escapes the title to prevent injection via title", () => {
    const html = buildBrandedHtml("info", '<script>x</script>', "<p>b</p>")
    expect(html).toContain("&lt;script&gt;")
    // The raw script tag must not appear as an executable element in the head/body title.
    expect(html).not.toContain("<script>x</script>")
  })

  test("all four severities produce distinct accent colors", () => {
    const colors = new Set(
      (["info", "success", "warning", "critical"] as const).map((s) => SEVERITY_META[s].color),
    )
    expect(colors.size).toBe(4)
  })
})
