import type { HonorResume } from "@/types/honor"
import { buildHonorResumeHtml } from "../buildHonorResumeHtml"
import type { HonorReportMeta } from "../buildHonorReportHtml"
import { resumeSlug } from "../exportHonorResume"

const META: HonorReportMeta = {
  fellowName: "Marcus Reyes",
  fellowTitle: "Program Management",
  fellowEmail: "marcus@honor.org",
  coachName: "S. Carter",
  coachTitle: "Transition Mentor",
  coachEmail: "coach@honor.org",
  dateLabel: "July 19, 2026",
}

function fixture(over: Partial<HonorResume> = {}): HonorResume {
  return {
    fellow_id: "f1",
    target: "Program Manager",
    headline: "Operations & Program Management Leader",
    summary: "Disciplined operations leader.",
    competencies: ["Program management", "Risk decisions"],
    experience: [
      { title: "Operations Team Lead", organization: "U.S. Navy", dates: "2016–2024", bullets: ["Led a 12-person team."] },
    ],
    education: ["B.S., Organizational Leadership"],
    certifications: ["PMP (in progress)"],
    frameworks: ["PRISM"],
    sources: ["Fellow's résumé", "PRISM"],
    grounded: true,
    disclaimer: "Coach must review before use.",
    ...over,
  }
}

describe("buildHonorResumeHtml", () => {
  const html = buildHonorResumeHtml(fixture(), META)

  test("THF cover with Résumé variant + prepared-for/by identities", () => {
    expect(html).toContain("The Honor Foundation")
    expect(html).toContain("Powered by InspiresGenius.com")
    expect(html).toContain(">Résumé<")
    expect(html).toContain("Marcus Reyes")
    expect(html).toContain("S. Carter")
    expect(html).toContain("July 19, 2026")
  })

  test("renders headline, summary, competencies, experience, education, certifications", () => {
    expect(html).toContain("Operations &amp; Program Management Leader")
    expect(html).toContain("Disciplined operations leader.")
    expect(html).toContain("Core Competencies")
    expect(html).toContain("Program management")
    expect(html).toContain("Experience")
    expect(html).toContain("Operations Team Lead")
    expect(html).toContain("Led a 12-person team.")
    expect(html).toContain("Education")
    expect(html).toContain("Certifications")
    expect(html).toContain("PMP (in progress)")
  })

  test("shows provenance + disclaimer", () => {
    expect(html).toContain("Fellow's résumé") // source list present (apostrophe not escaped)
    expect(html).toContain("Coach must review before use.")
  })

  test("empty sections are omitted, headline falls back to the fellow name", () => {
    const h = buildHonorResumeHtml(
      fixture({ headline: "", experience: [], education: [], certifications: [], competencies: [] }),
      META,
    )
    expect(h).not.toContain(">Experience<")
    expect(h).not.toContain(">Education<")
    expect(h).toContain("Marcus Reyes") // headline fallback
  })

  test("HTML-escapes content (no injection)", () => {
    const h = buildHonorResumeHtml(fixture({ headline: "A<script>x</script>" }), META)
    expect(h).toContain("A&lt;script&gt;x&lt;/script&gt;")
    expect(h).not.toContain("A<script>x</script>")
  })
})

describe("resumeSlug", () => {
  test("normalizes to a file-safe honor-resume slug", () => {
    expect(resumeSlug("Marcus Reyes")).toBe("honor-resume-marcus-reyes")
    expect(resumeSlug("")).toBe("honor-resume-fellow")
  })
})
