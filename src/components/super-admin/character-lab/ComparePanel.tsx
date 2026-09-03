import { useState } from "react"
import { toast } from "sonner"
import { HelpCircle, Loader2, Send, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CastPicker from "@/components/prism/narrative/CastPicker"
import ProfileMarkdown from "@/components/prism/narrative/ProfileMarkdown"
import NarrativeExportButtons from "@/components/prism/narrative/NarrativeExportButtons"
import {
  useAskAboutProfiles,
  useCompareProfiles,
  useSavedProfiles,
  useStarterQuestions,
} from "@/hooks/super-admin/useCharacterLab"
import { mapWithConcurrency } from "@/lib/mapWithConcurrency"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import type { NarrativeDoc } from "@/lib/exportNarrative"
import type { StarterQuestion } from "@/types/character-lab"

/** Server cap. Past four it stops being a comparison and becomes a list. */
const MAX_CAST = 4

/**
 * How many comparison sections to have in flight at once.
 *
 * 3, from the measurement that produced the same number for the write-up: seven
 * single-section requests fired together lost one to a 30.2s gateway timeout,
 * while the same seven at a concurrency of three lost none. The gateway's clock
 * starts when a request ARRIVES, so queueing server-side cannot help — the fan
 * has to be narrowed by the caller.
 */
const COMPARE_CONCURRENCY = 3

export default function ComparePanel() {
  const { data: profiles, isLoading } = useSavedProfiles()
  const compare = useCompareProfiles()
  const questions = useStarterQuestions()
  const ask = useAskAboutProfiles()

  const [selected, setSelected] = useState<string[]>([])
  const [comparison, setComparison] = useState("")
  const [starters, setStarters] = useState<StarterQuestion[]>([])
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  // The question AS ASKED, captured when the answer arrives. Exporting
  // `question` would caption the answer with whatever is in the box now, which
  // after clicking a second starter question is a different question entirely.
  const [answered, setAnswered] = useState("")
  const [notice, setNotice] = useState("")

  const names = (profiles ?? []).filter((p) => selected.includes(p.id)).map((p) => p.name)

  /**
   * Fetch the comparison in sections and stitch them in order.
   *
   * Part 0 is fetched first because it reports how many parts there are; the
   * rest then run at a bounded concurrency. A section that fails leaves a
   * visible marker rather than a silently short write-up — a missing "Friction
   * and fit" reads as "there is no friction", which is the opposite of unknown.
   */
  async function onCompare() {
    if (selected.length < 2) {
      toast.error("Pick at least two characters.")
      return
    }
    setComparison("")
    setAnswer("")
    try {
      const first = await compare.mutateAsync({ profile_ids: selected, part: 0 })
      setComparison(first.comparison)
      setNotice(first.notice)
      if (first.parts <= 1) return

      const rest = await mapWithConcurrency(
        Array.from({ length: first.parts - 1 }, (_, i) => i + 1),
        COMPARE_CONCURRENCY,
        (part) => compare.mutateAsync({ profile_ids: selected, part }),
      )
      const chunks = [first.comparison]
      rest.forEach((outcome, i) => {
        chunks.push(
          outcome.status === "fulfilled"
            ? outcome.value.comparison
            : `_Section ${i + 2} of ${first.parts} could not be generated._`,
        )
      })
      setComparison(chunks.join("\n\n"))
      const failed = rest.filter((o) => o.status === "rejected").length
      if (failed) toast.warning(`${failed} of ${first.parts} sections failed`)
    } catch (err) {
      toast.error(apiErrorMessage(err, "The comparison failed"))
    }
  }

  async function onQuestions() {
    if (!selected.length) {
      toast.error("Pick at least one character.")
      return
    }
    try {
      const result = await questions.mutateAsync({ profile_ids: selected })
      setStarters(result.questions)
      setNotice((n) => n || result.notice)
      if (!result.questions.length) {
        toast.warning("No questions came back — try again.")
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not fetch questions"))
    }
  }

  async function onAsk(text: string) {
    const q = text.trim()
    if (!q) return
    if (!selected.length) {
      toast.error("Pick at least one character first.")
      return
    }
    setAnswer("")
    try {
      const result = await ask.mutateAsync({ profile_ids: selected, question: q })
      setAnswer(result.answer)
      setAnswered(q)
      setNotice((n) => n || result.notice)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not answer that"))
    }
  }

  /** Built on click, not at render — see NarrativeExportButtons. */
  function comparisonDoc(): NarrativeDoc {
    return {
      title: names.join(" vs "),
      subtitle: "PRISM character comparison",
      notice,
      meta: [{ label: "Characters", value: names.join(", ") }],
      sections: [{ body: comparison }],
    }
  }

  function answerDoc(): NarrativeDoc {
    return {
      title: `${names.join(", ")} — ${answered.slice(0, 60)}`,
      subtitle: "PRISM character Q&A",
      notice,
      meta: [
        { label: "Characters", value: names.join(", ") },
        { label: "Question", value: answered },
      ],
      sections: [{ heading: "Answer", body: answer }],
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" aria-hidden /> Choose the cast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CastPicker
            idPrefix="cmp"
            profiles={profiles ?? []}
            loading={isLoading}
            selected={selected}
            onChange={setSelected}
            max={MAX_CAST}
            min={2}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={onCompare} disabled={compare.isPending || selected.length < 2}>
              {compare.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comparing…
                </>
              ) : (
                "Compare them"
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={onQuestions}
              disabled={questions.isPending || !selected.length}
            >
              {questions.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking…
                </>
              ) : (
                <>
                  <HelpCircle className="mr-2 h-4 w-4" /> Suggest questions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {starters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions worth asking</CardTitle>
            <p className="text-xs text-muted-foreground">
              Generated from these characters' actual scores, not a fixed list — each one names
              what makes it worth asking. Click to ask it.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {starters.map((q, i) => (
                <li key={`${i}-${q.question}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestion(q.question)
                      void onAsk(q.question)
                    }}
                    disabled={ask.isPending}
                    className="w-full rounded-md border px-3 py-2 text-left transition hover:bg-accent disabled:opacity-60"
                  >
                    <span className="block text-sm font-medium">{q.question}</span>
                    {q.why && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{q.why}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Ask about {names.length ? names.join(" and ") : "the cast"}</CardTitle>
          {answer && <NarrativeExportButtons build={answerDoc} label="an answer" />}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Label htmlFor="cl-ask" className="sr-only">
              Your question
            </Label>
            <Input
              id="cl-ask"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void onAsk(question)
                }
              }}
              placeholder="Which of them would you put in front of a hostile client?"
              className="min-w-[16rem] flex-1"
            />
            <Button onClick={() => onAsk(question)} disabled={ask.isPending || !question.trim()}>
              {ask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2">Ask</span>
            </Button>
          </div>
          {answer ? (
            <ProfileMarkdown text={answer} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Answers are grounded in the saved scores. Where the scores cannot settle a question,
              the answer says which scale would have.
            </p>
          )}
        </CardContent>
      </Card>

      {comparison && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">{names.join(" vs ")}</CardTitle>
            <NarrativeExportButtons build={comparisonDoc} label="a comparison" />
          </CardHeader>
          <CardContent>
            <ProfileMarkdown text={comparison} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
