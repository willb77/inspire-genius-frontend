/**
 * The exam run as a PDF, in the browser.
 *
 * Reuses the shared jsPDF writer (`@/lib/pdfWriter`) and `downloadBlob`, with
 * `jspdf` imported dynamically so it stays out of the entry bundle. Nothing is
 * sent anywhere: the PDF is built from the run and answers the page holds.
 *
 * The content is `examPdfBlocks`, a pure list of text blocks, so what the PDF
 * says is testable without a PDF. Every answer is printed with the option it
 * chose (or the answer itself on an open question), not only the misses.
 */
import { downloadBlob } from "@/lib/exportTranscript"
import { createPdfWriter, type PdfLike, type WriteOpts } from "@/lib/pdfWriter"
import type { ExamAnswer, ExamRunDetail } from "@/types/prism-exam"
import { answerShown, pct, pointsOf, selectedOption, shortSha, when } from "./export"

export type PdfBlock = { text: string; opts?: WriteOpts; rule?: boolean }

const MUTED: [number, number, number] = [75, 85, 99]
const VERDICT_COLOUR: Record<string, [number, number, number]> = {
  correct: [21, 128, 61],
  partial: [180, 83, 9],
  wrong: [185, 28, 28],
}

/** Everything the PDF prints, in order. Pure. */
export function examPdfBlocks(run: ExamRunDetail, answers: ExamAnswer[]): PdfBlock[] {
  const out: PdfBlock[] = [
    { text: "PRISM exam results", opts: { size: 20, style: "bold", gap: 2 } },
    { text: run.label?.trim() || `Run ${run.id.slice(0, 8)}`, opts: { size: 12, gap: 4 } },
    {
      text: `${run.tier} · ${when(run.completed_at ?? run.created_at)} · engine ${shortSha(run.engine_sha)} · judge ${
        run.judge_model ?? "unknown"
      } · ${run.total} questions (set v${run.question_set_version ?? "?"})`,
      opts: { size: 9, colour: MUTED, gap: 8 },
    },
    {
      text: `Score ${pct(run.score)} (${pointsOf(answers)} / ${run.total} points) · pass mark ${pct(run.pass_mark, 0)} · ${
        run.score === null ? "not finalised" : run.passed ? "PASS" : "FAIL"
      }`,
      opts: { size: 13, style: "bold", gap: 8 },
    },
  ]

  const chapters = Object.entries(run.by_chapter ?? {})
  if (chapters.length) {
    out.push({ text: "By chapter", opts: { size: 13, style: "bold", gap: 4 }, rule: true })
    for (const [key, c] of chapters) {
      out.push({
        text: `${c.title || key}: ${pct(c.score, 0)} · ${c.correct} correct, ${c.partial} partial, ${c.wrong} wrong of ${c.n}`,
        opts: { gap: 2 },
      })
    }
  }
  if (run.agents) {
    const agents = Object.entries(run.agents.by_agent ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")
    out.push({ text: `Answered by ${agents || "—"}.`, opts: { size: 9, colour: MUTED, gap: 4 } })
  }

  out.push({ text: `Answers (${answers.length})`, opts: { size: 13, style: "bold", gap: 6 }, rule: true })
  for (const a of answers) {
    const title = run.by_chapter?.[a.chapter]?.title || a.chapter
    out.push({
      text: `${a.question_id} · ${a.verdict ?? "no verdict"} · ${title}${a.page ? ` · p.${a.page}` : ""}`,
      opts: { size: 9, style: "bold", colour: VERDICT_COLOUR[a.verdict ?? ""] ?? MUTED, gap: 1 },
    })
    out.push({ text: a.question, opts: { gap: 2 } })
    out.push({
      text: `${selectedOption(a.answer) ? "Selected" : "Answer"} (${a.agent ?? "—"}): ${answerShown(a)}`,
      opts: { style: "bold", indent: 10, gap: 1 },
    })
    out.push({ text: `Expected: ${a.expected}`, opts: { size: 9, indent: 10, colour: MUTED, gap: a.verdict === "correct" ? 6 : 1 } })
    if (a.verdict !== "correct") {
      if (a.missing?.length) out.push({ text: `Missing: ${a.missing.join("; ")}`, opts: { size: 9, indent: 10, gap: 1 } })
      if (a.reason) out.push({ text: `Judge: ${a.reason}`, opts: { size: 9, indent: 10, gap: 1 } })
      if (a.error) out.push({ text: `Error: ${a.error}`, opts: { size: 9, indent: 10, gap: 1 } })
      out.push({ text: "", opts: { gap: 4 } })
    }
  }
  return out
}

export function examPdfFileName(run: ExamRunDetail): string {
  return `prism-exam-${run.tier}-${run.id.slice(0, 8)}.pdf`
}

export async function exportExamPdf(run: ExamRunDetail, answers: ExamAnswer[]): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const w = createPdfWriter(new jsPDF({ unit: "pt", format: "a4" }) as unknown as PdfLike)
  for (const block of examPdfBlocks(run, answers)) {
    if (block.rule) w.rule()
    w.write(block.text, block.opts)
  }
  w.footer(`PRISM exam — ${run.tier} — run ${run.id.slice(0, 8)}`)
  downloadBlob(examPdfFileName(run), (w.doc as unknown as { output: (t: string) => Blob }).output("blob"))
}
