import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Sparkles,
  Send,
  Loader2,
  FileText,
  FileDown,
  MessagesSquare,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown"
import { downloadBlob } from "@/lib/exportTranscript"
import { renderHtmlToPdf } from "@/lib/exportTranscript/renderPdf"
import {
  buildPortraitReportDoc,
  buildPortraitReportHtml,
  portraitReportFileBase,
  type PortraitQA,
} from "@/lib/lumen/portraitReport"
import {
  useSelfPortraitDescription,
  useAskSelfPortrait,
} from "@/hooks/lumen/useSelfPortrait"
import type { SelfPortrait } from "@/types/lumen"

/** Starter prompts — concrete, non-clinical, grounded in what a portrait holds. */
const SUGGESTIONS = [
  "What are my strengths, in plain language?",
  "Where might I have blind spots?",
  "How do I tend to behave under pressure?",
  "What would sharpen this portrait next?",
]

/**
 * The narrated half of the Self-Portrait: a formatted description of who the
 * portrait reads as, a box to ask it questions (answered inline, grounded in the
 * same portrait), and a one-click export of the whole thing to PDF or Word.
 *
 * The numbers and structure live in the cards below this on the page; this is
 * the plain-language read on top of them. Non-clinical throughout — a mirror to
 * think with, never a diagnosis.
 *
 * `showAsk` exists because the two pages that mount this diverged: the Lumen
 * Self-Portrait dropped the question box, Direction-Setting's Establish stage
 * kept it. Note that the non-clinical disclaimer normally sits inside that box,
 * so it is re-homed under the description whenever the box is hidden — the
 * caveat is not the ask box's to take with it.
 */
export function SelfPortraitNarrative({
  portrait,
  showAsk = true,
}: {
  portrait: SelfPortrait
  showAsk?: boolean
}) {
  const describe = useSelfPortraitDescription()
  const ask = useAskSelfPortrait()
  const [question, setQuestion] = useState("")
  const [history, setHistory] = useState<PortraitQA[]>([])
  const [busy, setBusy] = useState<null | "pdf" | "doc">(null)
  const answersRef = useRef<HTMLDivElement>(null)

  const description = describe.data?.answer ?? ""
  const disclaimer =
    ask.data?.disclaimer ?? describe.data?.disclaimer ?? ""

  async function submit(raw: string) {
    const q = raw.trim()
    if (!q || ask.isPending) return
    try {
      const res = await ask.mutateAsync(q)
      const answer = (res?.answer ?? "").trim()
      if (answer) setHistory((prev) => [...prev, { question: q, answer }])
      setQuestion("")
    } catch {
      toast.error("That didn't go through — please try again in a moment.")
    }
  }

  // Keep the newest answer in view as the conversation grows. Guarded because
  // scrollIntoView isn't implemented in jsdom (and is a nicety, not a contract).
  useEffect(() => {
    const el = answersRef.current
    if (history.length > 0 && typeof el?.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" })
    }
  }, [history.length])

  function reportInput() {
    const prism = portrait.prism
    // Title-cased for the document; the wire format is lowercase keys.
    const rows = (scores: Record<string, number | undefined> | undefined) =>
      Object.entries(scores ?? {})
        .filter(([, v]) => typeof v === "number")
        .map(([label, value]) => ({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          value: value as number,
        }))

    return {
      headline: portrait.headline,
      description: description || portrait.headline || "",
      qa: history,
      instruments: portrait.instruments,
      coverage: portrait.coverage,
      disclaimer: disclaimer || undefined,
      quadrants: rows(prism?.quadrants),
      dimensions: rows(prism?.dimensions),
      orientation: rows(prism?.orientation),
      scoreType: prism?.score_type,
      evidence: (portrait.evidence ?? []).map((e) => ({
        source: e.source,
        detail: e.detail,
      })),
      evidenceNote: portrait.evidence_note,
    }
  }

  async function exportPdf() {
    setBusy("pdf")
    try {
      const blob = await renderHtmlToPdf(buildPortraitReportHtml(reportInput()))
      downloadBlob(`${portraitReportFileBase()}.pdf`, blob)
      toast.success("Self-portrait exported to PDF.")
    } catch {
      toast.error("Could not generate the PDF.")
    } finally {
      setBusy(null)
    }
  }

  function exportDoc() {
    setBusy("doc")
    try {
      downloadBlob(`${portraitReportFileBase()}.doc`, buildPortraitReportDoc(reportInput()))
      toast.success("Self-portrait exported to Word.")
    } catch {
      toast.error("Could not generate the Word document.")
    } finally {
      setBusy(null)
    }
  }

  const exporting = busy !== null
  const canExport = Boolean(description) || history.length > 0

  return (
    <div className="space-y-4">
      {/* ── Formatted description ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
            In plain language
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportPdf}
              disabled={!canExport || exporting}
              title="Export your self-portrait as a PDF"
            >
              {busy === "pdf" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-1.5 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportDoc}
              disabled={!canExport || exporting}
              title="Export your self-portrait as a Word document"
            >
              {busy === "doc" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              Word
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {describe.isLoading ? (
            <div className="space-y-2" data-testid="description-loading">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : describe.isError ? (
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t compose a description just now. The portrait below still
              stands — try refreshing in a moment.
            </p>
          ) : (
            <AssistantMarkdown
              text={description || portrait.headline}
              className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            />
          )}
          {!showAsk && disclaimer && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{disclaimer}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Ask your portrait ── */}
      {showAsk && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessagesSquare className="h-4 w-4 text-violet-600" aria-hidden />
            Ask your self-portrait
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length > 0 && (
            <div className="space-y-3" ref={answersRef}>
              {history.map((qa, i) => (
                <div key={i} className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-1.5 flex items-start gap-2">
                    <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                    <span className="text-sm font-medium">{qa.question}</span>
                  </div>
                  <AssistantMarkdown
                    text={qa.answer}
                    className="pl-6 text-sm leading-relaxed text-foreground [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5"
                  />
                </div>
              ))}
            </div>
          )}

          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading your portrait…
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              aria-label="Ask a question about your self-portrait"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void submit(question)
                }
              }}
              placeholder="Ask anything about what your portrait says — e.g. “Where might I have blind spots?”"
              disabled={ask.isPending}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void submit(s)}
                    disabled={ask.isPending}
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-violet-300 hover:text-violet-700 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                onClick={() => void submit(question)}
                disabled={ask.isPending || question.trim().length === 0}
              >
                {ask.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                Ask
              </Button>
            </div>
          </div>

          {disclaimer && (
            <p className="text-xs leading-relaxed text-muted-foreground">{disclaimer}</p>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  )
}

export default SelfPortraitNarrative
