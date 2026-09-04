/**
 * Client-side PDF export for a member's development dossier.
 *
 * The growth-service /share endpoint records the share event but returns no
 * file, so "Export PDF" is generated in the browser from the already-loaded
 * dossier via jsPDF and downloaded directly — no server round-trip, no new
 * dependency (jspdf is already in the bundle).
 */
import { jsPDF } from "jspdf"
import type { MemberDossier } from "@/types/development"

const GOAL_CATEGORY_LABEL: Record<string, string> = {
  career_history: "Career history",
  current_job: "Current job",
  workplace_situation: "Workplace situation",
  career_ambitions: "Career ambitions",
  personal_goals: "Personal goals",
}

export function exportDossierPdf(dossier: MemberDossier): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const marginX = 48
  const maxWidth = 500
  let y = 56

  const line = (text: string, size = 11, bold = false, gap = 16) => {
    if (y > 780) {
      doc.addPage()
      y = 56
    }
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(size)
    const wrapped = doc.splitTextToSize(text, maxWidth)
    doc.text(wrapped, marginX, y)
    y += gap * wrapped.length
  }
  const heading = (text: string) => {
    y += 8
    line(text, 13, true, 18)
  }

  const name = dossier.member?.name || "Team member"
  line(name, 20, true, 26)
  const sub = [dossier.member?.title, dossier.member?.department].filter(Boolean).join(" · ")
  if (sub) line(sub, 11, false, 18)
  if (dossier.reconciledHeadline) line(dossier.reconciledHeadline, 11, false, 18)
  line(`Confidence: ${dossier.overallConfidence ?? "—"}`, 10, false, 20)

  const prism = dossier.profile?.prism ?? []
  if (prism.length) {
    heading("Behavioral profile (PRISM)")
    prism.forEach((d) => line(`${d.label}: ${Math.round(d.score)}`, 11, false, 15))
  }

  // Goals offering, Phase 2/4: a dossier redacted for a caller without the
  // member's goals grant says so on paper too — never a silently missing section.
  if (dossier.goalsNotShared) {
    heading("Goals")
    line("Not shared with you.", 10, false, 14)
  } else if (dossier.goals?.length) {
    heading("Goals")
    dossier.goals.forEach((g) => {
      line(`• ${g.title}`, 11, true, 15)
      const meta = [GOAL_CATEGORY_LABEL[g.category] ?? g.category, g.horizon, g.status]
        .filter(Boolean)
        .join(" · ")
      if (meta) line(`   ${meta}`, 9, false, 13)
      if (g.motivation) line(`   Why: ${g.motivation}`, 9, false, 14)
    })
  }

  if (dossier.gaps?.length) {
    heading("Development gaps")
    dossier.gaps.forEach((g) => line(`• ${g.competency}`, 11, false, 15))
  }

  if (dossier.matches?.length) {
    heading("Career & job matches")
    dossier.matches.forEach((m) => line(`• ${m.title} — ${Math.round(m.fitScore)}% fit`, 11, false, 15))
  }

  if (dossier.milestones?.length) {
    heading("Roadmap")
    dossier.milestones.forEach((m) => line(`• [${m.horizon}] ${m.title} (${m.status})`, 11, false, 15))
  }

  const safe = name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "member"
  doc.save(`development-dossier-${safe}.pdf`)
}
