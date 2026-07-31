import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink, Loader2, MessagesSquare, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { LUMEN_QUESTION_GROUPS } from "@/constants/lumen/coachingQuestions"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import { useCoachAnswer } from "@/hooks/lumen/useCoachAnswer"
import type { PortraitSourceKey, PortraitSources } from "@/types/lumen"
import { SOURCE_LABELS, SOURCE_ORDER, buildScopeLine } from "./coachingScope"
import { CoachingAnswers } from "./CoachingAnswers"

/**
 * Personal coaching — a Meridian conversation that starts already knowing you.
 *
 * This is the answer to "what triggers personal coaching, and how does it
 * work?": *you* trigger it, by picking what to draw on and what to talk about.
 * Moments are the push half of Lumen (something is coming up, here's a nudge);
 * this is the pull half (you have a question, and the conversation shouldn't
 * begin by asking who you are).
 *
 * **Answers land here, on this page.** Asking used to navigate away to the chat
 * surface, which made a coaching question feel like leaving Lumen and cost the
 * context the person had just assembled with the source checkboxes. Now the
 * default action answers inline and the answers accumulate, so a run of
 * questions reads as one session — each answer keepable on its own via Copy,
 * Print and Export ▾ (see `CoachingAnswers`).
 *
 * Meridian is still never bypassed: inline answers go through the ordinary
 * async-job path, so she classifies and routes to whichever specialist the
 * question needs. "Open in Meridian" remains as the secondary action for anyone
 * who wants to keep talking rather than read one answer — it carries
 * `{ prefillPrompt, autoSubmit }`, the one-shot mechanism HomeV2's starter
 * questions already use, which `MeridianChat` consumes once at mount.
 *
 * **What the source checkboxes actually do.** They are written into the opening
 * message as an explicit instruction ("Draw on my PRISM profile and my résumé;
 * leave my bio out of it"). They are a stated scope, not a server-side filter —
 * the platform loads a user's profile ambiently and this page cannot unload it.
 * That is worth being precise about rather than implying a guarantee the
 * transport can't make: today the honest claim is that the coach is *told* what
 * to work from. Enforcing it needs a per-session scope on the chat transport,
 * which does not exist yet.
 */

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
)

function SourcePicker({
  sources,
  selected,
  onToggle,
}: {
  sources: PortraitSources
  selected: PortraitSourceKey[]
  onToggle: (key: PortraitSourceKey) => void
}) {
  return (
    <div className="space-y-2">
      {SOURCE_ORDER.map((key) => {
        const present = sources[key]
        const { label, hint } = SOURCE_LABELS[key]
        return (
          <label
            key={key}
            htmlFor={`lumen_src_${key}`}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-sm",
              present ? "cursor-pointer hover:bg-muted/50" : "opacity-60"
            )}
          >
            <input
              id={`lumen_src_${key}`}
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              checked={present && selected.includes(key)}
              disabled={!present}
              onChange={() => onToggle(key)}
            />
            <span className="space-y-0.5">
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">
                {present ? hint : "Nothing on file yet — add it and it'll show up here."}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

export default function CoachingPage() {
  const navigate = useNavigate()
  const { data: portrait, isLoading } = useSelfPortrait()

  // A portrait that loaded WITHOUT `sources` came from an agent-engine that
  // predates the four-source composer — which is a real state, because the
  // frontend deploys to dev and staging-B on merge while the backend is
  // promoted separately. "No sources field" is not "no sources": telling
  // someone with a full PRISM profile that we have nothing to read about them
  // would be a lie the UI has no business telling. So the picker is hidden and
  // no scope line is written, leaving the coach's default behaviour intact.
  const sourcesKnown = portrait?.sources !== undefined
  const sources: PortraitSources = portrait?.sources ?? {
    prism: false,
    assessments: false,
    resume: false,
    bio: false,
  }

  const available = useMemo(
    () => SOURCE_ORDER.filter((k) => sources[k]),
    // `sources` is rebuilt each render; the identity that matters is the flags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sources.prism, sources.assessments, sources.resume, sources.bio]
  )

  const [selected, setSelected] = useState<PortraitSourceKey[]>([])
  const [groupKey, setGroupKey] = useState(LUMEN_QUESTION_GROUPS[0].key)
  const [question, setQuestion] = useState("")
  const [extra, setExtra] = useState("")
  const [custom, setCustom] = useState("")
  const coach = useCoachAnswer()

  // Default to everything on file: the point of Lumen is that the coach already
  // knows you, so opting *out* should be the deliberate act, not opting in.
  useEffect(() => {
    setSelected(available)
  }, [available])

  const group =
    LUMEN_QUESTION_GROUPS.find((g) => g.key === groupKey) ?? LUMEN_QUESTION_GROUPS[0]

  const toggle = (key: PortraitSourceKey) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )

  /**
   * The scope line and the "anything else" note are instructions to the coach,
   * not part of the question. They go into the prompt but are kept out of the
   * label shown on the answer card and in the exported document, which should
   * read as the question the person actually asked.
   */
  const compose = (raw: string): { question: string; prompt: string } | null => {
    const question = raw.trim()
    if (!question) return null
    const scope = sourcesKnown
      ? buildScopeLine(
          SOURCE_ORDER.filter((k) => selected.includes(k)),
          available,
          extra
        )
      : extra.trim() && `Also relevant: ${extra.trim()}`
    return { question, prompt: scope ? `${question}\n\n${scope}` : question }
  }

  const answerHere = (raw: string) => {
    const composed = compose(raw)
    if (!composed) return
    void coach.ask(composed)
    setCustom("")
  }

  const openInMeridian = (raw: string) => {
    const composed = compose(raw)
    if (!composed) return
    navigate(ROUTES.MERIDIAN_CHAT, {
      state: { prefillPrompt: composed.prompt, autoSubmit: true },
    })
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessagesSquare className="h-6 w-6 text-muted-foreground" aria-hidden />
          Personal coaching
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Coaching that opens already knowing your profile. Choose what it should work
          from, pick something to talk about, and the answer appears right here —
          rather than spending the first ten minutes establishing who you are.
        </p>
        <p className="max-w-3xl text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Moments come to you; this you
          come to.</span>{" "}
          Moments fire when something is coming up. Coaching is for the question you
          already have.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What should the coach work from?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2" data-testid="sources-loading">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <>
              {sourcesKnown ? (
                <>
                  <SourcePicker sources={sources} selected={selected} onToggle={toggle} />
                  {available.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      We have nothing to read about you yet, so the conversation starts
                      from what you type. Add a résumé or complete PRISM and this fills in.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The coach draws on everything on your profile. Choosing which parts to
                  include isn't available in this environment yet.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="lumen_extra">Anything else it should know?</Label>
                <Textarea
                  id="lumen_extra"
                  rows={2}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="e.g. I've just moved into a management role and I'm three weeks in."
                />
                <p className="text-xs text-muted-foreground">
                  Added to the opening message. Not saved to your profile.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What do you want to talk about?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lumen_category">Area</Label>
            <select
              id="lumen_category"
              value={groupKey}
              onChange={(e) => {
                setGroupKey(e.target.value)
                setQuestion("")
              }}
              className={selectClass}
            >
              {LUMEN_QUESTION_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.category}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{group.blurb}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lumen_question">Question</Label>
            <select
              id="lumen_question"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value)
                if (e.target.value) answerHere(e.target.value)
              }}
              disabled={coach.isPending}
              className={selectClass}
            >
              <option value="">Pick a question to answer it here…</option>
              {group.questions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Choosing a question answers it below, on this page.
            </p>
          </div>
        </CardContent>
      </Card>

      <CoachingAnswers
        answers={coach.answers}
        pendingQuestion={coach.pendingQuestion}
        isError={coach.isError}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Or ask your own</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="lumen_custom"
            aria-label="Ask your own question"
            rows={3}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Anything you want to work through…"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => answerHere(custom)}
              disabled={custom.trim().length === 0 || coach.isPending}
            >
              {coach.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="mr-2 h-4 w-4" aria-hidden />
              )}
              Answer it here
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openInMeridian(custom)}
              disabled={custom.trim().length === 0}
              title="Continue this in a full Meridian conversation"
            >
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
              Open in Meridian
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Answers appear on this page, and each one can be copied, printed or
            exported to Word or PDF. Open in Meridian instead if you want to keep
            talking it through.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
