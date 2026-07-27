import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MessagesSquare, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { LUMEN_QUESTION_GROUPS } from "@/constants/lumen/coachingQuestions"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import type { PortraitSourceKey, PortraitSources } from "@/types/lumen"

/**
 * Personal coaching — a Meridian conversation that starts already knowing you.
 *
 * This is the answer to "what triggers personal coaching, and how does it
 * work?": *you* trigger it, by picking what to draw on and what to talk about.
 * Moments are the push half of Lumen (something is coming up, here's a nudge);
 * this is the pull half (you have a question, and the conversation shouldn't
 * begin by asking who you are).
 *
 * Reuses the platform Meridian chat surface rather than adding a second chat:
 * navigation carries `{ prefillPrompt, autoSubmit }` — the one-shot mechanism
 * HomeV2's starter questions already use. `MeridianChat` consumes it at mount,
 * submits once, and clears the history state so a refresh cannot resend.
 * Meridian is never bypassed; she routes to whichever specialist the question
 * needs, which is why this page seeds a question rather than calling an agent.
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

const SOURCE_LABELS: Record<PortraitSourceKey, { label: string; hint: string }> = {
  prism: {
    label: "My PRISM scores",
    hint: "How you're wired — the anchor everything else reconciles against.",
  },
  assessments: {
    label: "My other assessments",
    hint: "Anything else you've taken — DISC, Big Five, MBTI, CliftonStrengths.",
  },
  resume: {
    label: "My résumé",
    hint: "The record of what you've actually done.",
  },
  bio: {
    label: "My bio",
    hint: "How you describe yourself, in your own words.",
  },
}

const SOURCE_ORDER: PortraitSourceKey[] = ["prism", "assessments", "resume", "bio"]

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
)

/**
 * The scope line prepended to the question.
 *
 * Naming what to leave out matters as much as naming what to use: a user who
 * unticks their résumé usually means "don't argue from my job history", and an
 * instruction that only lists inclusions doesn't say that.
 */
export function buildScopeLine(
  selected: PortraitSourceKey[],
  available: PortraitSourceKey[],
  extra: string
): string {
  const parts: string[] = []
  const name = (k: PortraitSourceKey) => SOURCE_LABELS[k].label.replace(/^My /, "my ")

  if (selected.length > 0) {
    parts.push(`Draw on ${selected.map(name).join(", ")}.`)
  }
  const excluded = available.filter((k) => !selected.includes(k))
  if (excluded.length > 0) {
    parts.push(`Leave ${excluded.map(name).join(" and ")} out of this one.`)
  }
  if (selected.length === 0 && excluded.length > 0) {
    parts.push("Answer from what I tell you here rather than from my profile.")
  }
  const trimmed = extra.trim()
  if (trimmed) parts.push(`Also relevant: ${trimmed}`)
  return parts.join(" ")
}

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

  const ask = (raw: string) => {
    const body = raw.trim()
    if (!body) return
    const scope = buildScopeLine(
      SOURCE_ORDER.filter((k) => selected.includes(k)),
      available,
      extra
    )
    navigate(ROUTES.MERIDIAN_CHAT, {
      state: { prefillPrompt: scope ? `${body}\n\n${scope}` : body, autoSubmit: true },
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
          A coaching conversation that opens already knowing your profile. Choose what
          it should work from, pick something to talk about, and it starts there —
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
              <SourcePicker sources={sources} selected={selected} onToggle={toggle} />
              {available.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  We have nothing to read about you yet, so the conversation starts from
                  what you type. Add a résumé or complete PRISM and this fills in.
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
                if (e.target.value) ask(e.target.value)
              }}
              className={selectClass}
            >
              <option value="">Pick a question to start the conversation…</option>
              {group.questions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Choosing a question opens the coach and asks it for you.
            </p>
          </div>
        </CardContent>
      </Card>

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
          <Button
            type="button"
            onClick={() => ask(custom)}
            disabled={custom.trim().length === 0}
          >
            <Send className="mr-2 h-4 w-4" aria-hidden />
            Start the conversation
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
