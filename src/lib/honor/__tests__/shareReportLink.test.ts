import { buildMailtoLink, copyReportLink } from "../shareReportLink"

describe("copyReportLink", () => {
  afterEach(() => {
    // @ts-expect-error reset the mocked clipboard
    delete navigator.clipboard
  })

  test("returns true when the clipboard write succeeds", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    await expect(copyReportLink("https://s3/report.pdf")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("https://s3/report.pdf")
  })

  test("returns false when the clipboard API rejects/blocked", async () => {
    const writeText = jest.fn().mockRejectedValue(new Error("blocked"))
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    await expect(copyReportLink("https://s3/report.pdf")).resolves.toBe(false)
  })
})

describe("buildMailtoLink", () => {
  test("builds a mailto: with the recipient, subject, intro, and link in the body", () => {
    const href = buildMailtoLink({
      to: "hiring@acme.com",
      subject: "Résumé — Marcus Reyes",
      intro: "Please find the résumé below.",
      url: "https://s3/resume.pdf?sig=abc",
    })
    expect(href.startsWith("mailto:hiring%40acme.com?")).toBe(true)
    expect(href).toContain(encodeURIComponent("Résumé — Marcus Reyes"))
    expect(href).toContain(encodeURIComponent("https://s3/resume.pdf?sig=abc"))
    expect(href).toContain(encodeURIComponent("Please find the résumé below."))
  })

  test("tolerates an empty recipient", () => {
    expect(buildMailtoLink({ subject: "S", intro: "I", url: "https://s3/x.pdf" }).startsWith("mailto:?")).toBe(true)
  })
})
