import type { ExamAnswer, ExamRunDetail, ExamVerdict } from "@/types/prism-exam"
import { VERDICT_SCORE } from "@/types/prism-exam"

/**
 * Pure builders for the exam page's exports and small formatters. Nothing
 * here touches the DOM, so the page can hand a run and its answers to these
 * and pass the result to `downloadBlob`.
 */

export function pct(score: number | null | undefined, digits = 1): string {
  return score === null || score === undefined ? "—" : `${(score * 100).toFixed(digits)}%`
}

export function scoreOf(verdict: ExamVerdict | null | undefined): number {
  return verdict ? (VERDICT_SCORE[verdict] ?? 0) : 0
}

export function when(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso.slice(0, 16) : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function shortSha(sha: string | null | undefined): string {
  return sha ? sha.replace(/^sha-/, "").slice(0, 8) : "—"
}

export function runTitle(run: { label: string | null; created_at: string; id: string }): string {
  return run.label?.trim() || `Run ${when(run.created_at)} · ${run.id.slice(0, 8)}`
}

/** Points earned across the answers on file so far. */
export function pointsOf(answers: ExamAnswer[]): number {
  return answers.reduce((sum, a) => sum + scoreOf(a.verdict), 0)
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function answersToCsv(run: ExamRunDetail, answers: ExamAnswer[]): string {
  const header = [
    "run_id", "tier", "label", "engine_sha", "question_id", "chapter", "page", "question", "expected",
    "answer", "agent", "contributing_agents", "verdict", "score", "missing", "reason", "elapsed_s", "session_id", "error",
  ]
  const rows = answers.map((a) => [
    run.id, run.tier, run.label ?? "", run.engine_sha ?? "", a.question_id, a.chapter, a.page ?? "", a.question,
    a.expected, a.answer ?? "", a.agent ?? "", (a.contributing_agents ?? []).join("|"), a.verdict ?? "",
    scoreOf(a.verdict), (a.missing ?? []).join("|"), a.reason ?? "", a.elapsed_s ?? "", a.session_id ?? "", a.error ?? "",
  ])
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"
}

/** The same scorecard shape the CLI harness writes to docs/prism/handbook-exam/. */
export function answersToMarkdown(run: ExamRunDetail, answers: ExamAnswer[]): string {
  const lines: string[] = []
  const title = run.label?.trim() ? `${run.label.trim()} — ` : ""
  lines.push(`# PRISM practitioner exam — ${title}${run.tier} — ${when(run.completed_at ?? run.created_at)}`)
  lines.push("")
  lines.push(`- Run: \`${run.id}\``)
  lines.push(`- Engine: \`${run.engine_sha ?? "unknown"}\` · judge: ${run.judge_model ?? "unknown"} · concurrency ${run.concurrency}`)
  lines.push(`- Questions: ${run.total} · answered: ${run.done} · status: ${run.status}`)
  lines.push(
    `- **Score: ${pct(run.score)}** (${pointsOf(answers)} / ${run.total} points) · pass mark ${pct(run.pass_mark, 0)} · ${
      run.score === null ? "not finalised" : run.passed ? "PASS" : "FAIL"
    }`,
  )
  lines.push("")
  const chapters = run.by_chapter ?? {}
  if (Object.keys(chapters).length) {
    lines.push("## By chapter")
    lines.push("")
    lines.push("| Chapter | Questions | Correct | Partial | Wrong | Score |")
    lines.push("|---|---:|---:|---:|---:|---:|")
    for (const [key, c] of Object.entries(chapters)) {
      lines.push(`| ${c.title || key} | ${c.n} | ${c.correct} | ${c.partial} | ${c.wrong} | ${pct(c.score, 0)} |`)
    }
    lines.push("")
  }
  if (run.agents) {
    const agents = Object.entries(run.agents.by_agent ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")
    lines.push(`Answered by: ${agents || "—"}. Aura consulted by another agent on ${run.agents.aura_consults} answer(s).`)
    lines.push("")
  }
  const misses = answers.filter((a) => a.verdict !== "correct")
  lines.push(`## Misses (${misses.length})`)
  lines.push("")
  if (!misses.length) lines.push("None.")
  for (const a of misses) {
    lines.push(`### ${a.question_id} · ${a.chapter}${a.page ? ` · p.${a.page}` : ""} · **${a.verdict ?? "no verdict"}**`)
    lines.push("")
    lines.push(`**Q.** ${a.question}`)
    lines.push("")
    lines.push(`**Expected.** ${a.expected}`)
    lines.push("")
    lines.push(`**Answer (${a.agent ?? "—"}).** ${(a.answer ?? "(no answer)").trim()}`)
    lines.push("")
    if (a.missing?.length) lines.push(`**Missing.** ${a.missing.join("; ")}`)
    if (a.reason) lines.push(`**Judge.** ${a.reason}`)
    if (a.error) lines.push(`**Error.** ${a.error}`)
    lines.push("")
  }
  lines.push("## All answers")
  lines.push("")
  lines.push("| # | Chapter | Verdict | Agent | Consulted | Question |")
  lines.push("|---|---|---|---|---|---|")
  for (const a of answers) {
    const consulted = (a.contributing_agents ?? []).filter((x) => x !== a.agent).join(", ")
    lines.push(
      `| ${a.question_id} | ${a.chapter} | ${a.verdict ?? "—"} | ${a.agent ?? "—"} | ${consulted || "—"} | ${a.question.replace(/\|/g, "\\|")} |`,
    )
  }
  lines.push("")
  return lines.join("\n")
}
