import { buildResumeHtml, esc, resumeToPlainText } from "@/lib/resume/buildResumeHtml"
import { resumeFileSlug } from "@/lib/resume/exportResume"
import type { GeneratedResume } from "@/types/resumeWriter"

const resume = (over: Partial<GeneratedResume> = {}): GeneratedResume => ({
  target: "Operations Manager",
  headline: "Operations Leader",
  summary: "Runs teams well.",
  competencies: ["Planning", "Budgeting"],
  experience: [{ title: "Lead", organization: "Acme", dates: "2020–2024", bullets: ["Led a team of 8"] }],
  education: ["BA, Example University"],
  certifications: ["PMP"],
  sources: ["Your résumé", "PRISM"],
  grounded: true,
  disclaimer: "AI-drafted from your own documents. Review before use.",
  usedToday: 1,
  dailyLimit: 5,
  ...over,
})

test("every model-written string is escaped — a <script> in the draft never becomes markup", () => {
  const html = buildResumeHtml(
    resume({ summary: '<script>alert("x")</script>', competencies: ["<img src=x onerror=1>"] }),
    "Test <b>Member</b>",
  )
  expect(html).not.toContain("<script>alert")
  expect(html).not.toContain("<img src=x")
  expect(html).not.toContain("<b>Member</b>")
  expect(html).toContain("&lt;script&gt;")
})

test("carries the platform palette and no third-party branding", () => {
  const html = buildResumeHtml(resume(), "Test Member")
  expect(html).toContain("#0B1F3A")
  expect(html).toContain("#127A8A")
  expect(html).not.toMatch(/Honor|THF|confidential/i)
})

test("renders each section, and omits empty ones", () => {
  const html = buildResumeHtml(resume({ certifications: [] }), "Test Member")
  for (const s of ["Professional Summary", "Core Competencies", "Experience", "Education", "Led a team of 8"]) {
    expect(html).toContain(s)
  }
  expect(html).not.toContain("Certifications")
})

test("esc covers quotes too", () => {
  expect(esc(`"a" & 'b'`)).toBe("&quot;a&quot; &amp; &#39;b&#39;")
})

test("plain text for Copy has the sections and no markup", () => {
  const txt = resumeToPlainText(resume(), "Test Member")
  expect(txt.startsWith("Test Member\nOperations Leader")).toBe(true)
  expect(txt).toContain("EXPERIENCE\nLead — Acme — 2020–2024\n• Led a team of 8")
  expect(txt).not.toContain("<")
})

test("file slug strips accents and punctuation", () => {
  expect(resumeFileSlug("Zoë O'Test")).toBe("resume-zoe-o-test")
  expect(resumeFileSlug("")).toBe("resume-my")
})
