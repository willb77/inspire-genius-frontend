// Résumé Writer → Word (.docx) (RW2, 2026-10-24). Recruiters often ask for Word.
//
// The same sections, in the same order, as the PDF (`buildResumeHtml`) and the
// Copy text, so the three cannot disagree about what the résumé says. `docx` is
// already a dependency and is imported dynamically, as every other Word export
// here does, so it stays out of the entry bundle. Nothing the fabrication check
// removed is in the document: the page lists those, the file never does.
import { RESUME_PALETTE } from "./buildResumeHtml"
import { resumeFileSlug } from "./exportResume"
import type { GeneratedResume } from "@/types/resumeWriter"

const hex = (c: string) => c.replace("#", "")

/** The résumé as a Word document. */
export async function buildResumeDocx(resume: GeneratedResume, name: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx")
  const navy = hex(RESUME_PALETTE.navy)
  const teal = hex(RESUME_PALETTE.teal)
  const gold = hex(RESUME_PALETTE.gold)

  const section = (title: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: title, bold: true, color: navy, size: 24 })],
    })
  const bullet = (text: string) =>
    new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text, size: 20 })] })

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ children: [new TextRun({ text: name, bold: true, size: 40, color: navy })] }),
  ]
  if (resume.headline) {
    children.push(new Paragraph({ children: [new TextRun({ text: resume.headline, bold: true, size: 24, color: teal })] }))
  }
  if (resume.target) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: `Target — ${resume.target}`, size: 17, color: gold, allCaps: true })] }),
    )
  }
  if (resume.summary) {
    children.push(section("Professional Summary"), new Paragraph({ children: [new TextRun({ text: resume.summary, size: 21 })] }))
  }
  if (resume.competencies.length) {
    children.push(
      section("Core Competencies"),
      new Paragraph({ children: [new TextRun({ text: resume.competencies.join("  ·  "), size: 20 })] }),
    )
  }
  if (resume.experience.length) {
    children.push(section("Experience"))
    for (const e of resume.experience) {
      const head = [new TextRun({ text: e.title, bold: true, size: 21, color: navy })]
      if (e.dates) head.push(new TextRun({ text: `   ${e.dates}`, size: 18, color: "6B7785" }))
      children.push(new Paragraph({ spacing: { before: 120 }, children: head }))
      if (e.organization) {
        children.push(new Paragraph({ children: [new TextRun({ text: e.organization, bold: true, size: 19, color: teal })] }))
      }
      for (const b of e.bullets) children.push(bullet(b))
    }
  }
  if (resume.education.length) {
    children.push(section("Education"), ...resume.education.map(bullet))
  }
  if (resume.certifications.length) {
    children.push(section("Certifications"), ...resume.certifications.map(bullet))
  }
  const sources = resume.sources.length ? `Drafted from: ${resume.sources.join(" · ")}. ` : ""
  children.push(
    new Paragraph({
      spacing: { before: 360 },
      children: [new TextRun({ text: `${sources}${resume.disclaimer}`, italics: true, size: 16, color: "6B7785" })],
    }),
  )

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}

export async function renderResumeDocx(
  resume: GeneratedResume,
  name: string,
): Promise<{ fileName: string; blob: Blob }> {
  return { fileName: `${resumeFileSlug(name)}.docx`, blob: await buildResumeDocx(resume, name) }
}
