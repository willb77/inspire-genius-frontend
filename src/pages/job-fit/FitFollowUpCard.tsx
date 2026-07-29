import { useState } from "react"
import { MessagesSquare, Loader2, Send } from "lucide-react"
import type { FitDetail } from "@/types/job-fit"
import { useExplainFit } from "@/hooks/job-fit/useExplainFit"
import { toExplainBody } from "@/services/job-fit/explain.service"
import { FitCard, FitSectionTitle } from "./_shared"
import { fitPercent } from "./_fit"

type QA = { question: string; answer: string }

/**
 * Ask a follow-up about your fit — and see the answer INLINE, right here in Job
 * Fit (unlike the Coach page, which seeds a separate Meridian chat). Several
 * follow-ups accumulate on the page so the person can keep exploring without
 * navigating away. Answers are grounded only in the person's own fit numbers.
 */
export function FitFollowUpCard({ data }: { data: FitDetail }) {
  const explain = useExplainFit()
  const [question, setQuestion] = useState("")
  const [history, setHistory] = useState<QA[]>([])
  const [error, setError] = useState(false)
  const pct = fitPercent(data.fitScore, data.totalVariation, data.perDimension.length || 22)

  async function ask() {
    const q = question.trim()
    if (!q || explain.isPending) return
    setError(false)
    try {
      const res = await explain.mutateAsync(toExplainBody(data, pct, q))
      const answer = (res.answer || "").trim() || res.overview
      setHistory((prev) => [...prev, { question: q, answer }])
      setQuestion("")
    } catch {
      setError(true)
    }
  }

  return (
    <FitCard className="mb-6">
      <FitSectionTitle>Ask about your fit</FitSectionTitle>
      <p className="mb-3 text-sm text-[#6b7280]">
        Ask anything about this role and your development — the answer appears right here.
      </p>

      {history.length > 0 && (
        <div className="mb-4 space-y-3">
          {history.map((qa, i) => (
            <div key={i} className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
              <div className="mb-1.5 flex items-start gap-2">
                <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
                <span className="text-sm font-medium text-[#1f2937]">{qa.question}</span>
              </div>
              <p className="whitespace-pre-line pl-6 text-sm leading-relaxed text-[#374151]">
                {qa.answer}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask()
          }}
          placeholder="e.g. Which gap should I focus on first, and how?"
          className="min-h-[64px] flex-1 resize-y rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#0D9488]"
        />
        <button
          type="button"
          onClick={ask}
          disabled={!question.trim() || explain.isPending}
          className="inline-flex h-fit items-center justify-center gap-1.5 self-end rounded-lg bg-[#0D9488] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b8078] disabled:opacity-50"
        >
          {explain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-[#b91c1c]">
          That didn&apos;t go through — please try again in a moment.
        </p>
      )}
    </FitCard>
  )
}
