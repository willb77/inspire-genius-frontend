import { useState } from "react"
import { Bookmark, Check, Sparkles, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useAskMoment, useMoments, useSetMomentState } from "@/hooks/lumen/useMoments"
import type { Moment, MomentState } from "@/types/lumen"

/**
 * "Moments" — just-in-time guidance at the point of use.
 *
 * Two halves: an ask box for the situation in front of you, and the feed of
 * everything generated so far (including proactive Moments once the scheduler
 * ships). The ask box is deliberately the top of the page — the pull path is
 * the one a user can rely on today.
 */

/** Situations common enough to be worth one tap instead of typing. */
const PRESETS = [
  "A 1:1 with someone more senior who intimidates me",
  "Giving difficult feedback to a peer",
  "A salary negotiation",
  "Presenting to a room I don't know",
  "A conversation I've been avoiding",
]

const STATE_BADGE: Record<MomentState, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  acted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  dismissed: "bg-slate-100 text-slate-600 border-slate-200",
  saved: "bg-amber-100 text-amber-800 border-amber-200",
}

const TRIGGER_LABEL: Record<Moment["trigger"], string> = {
  pull: "You asked",
  calendar: "Before your meeting",
  cadence: "Weekly check-in",
}

function MomentBody({ body }: { body: string }) {
  // The backend composes the body with blank-line-separated parts (nudge,
  // opener, watch-out), so paragraphs are the meaningful unit.
  return (
    <div className="space-y-2 text-sm">
      {body.split("\n\n").map((paragraph, i) => (
        <p key={i} className={i === 0 ? "" : "text-muted-foreground"}>
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function MomentCard({ moment }: { moment: Moment }) {
  const { mutate: setState, isPending } = useSetMomentState()
  const act = (state: MomentState) => setState({ momentId: moment.id, state })

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{TRIGGER_LABEL[moment.trigger]}</Badge>
          <Badge className={STATE_BADGE[moment.state]}>{moment.state}</Badge>
        </div>
        {moment.created_at && (
          <span className="text-xs text-muted-foreground">
            {new Date(moment.created_at).toLocaleString()}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {moment.context && (
          <p className="text-xs italic text-muted-foreground">“{moment.context}”</p>
        )}
        <MomentBody body={moment.body} />
        {moment.state === "new" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("acted")}>
              <Check className="mr-1 h-4 w-4" aria-hidden />
              I used this
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("saved")}>
              <Bookmark className="mr-1 h-4 w-4" aria-hidden />
              Save
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => act("dismissed")}>
              <X className="mr-1 h-4 w-4" aria-hidden />
              Not useful
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Moments() {
  const [context, setContext] = useState("")
  const { data: feed, isLoading } = useMoments()
  const { mutate: ask, data: fresh, isPending, isError } = useAskMoment()

  const submit = () => {
    const trimmed = context.trim()
    if (trimmed.length < 3) return
    ask({ context: trimmed })
    setContext("")
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Moments</h1>
        <p className="max-w-2xl text-muted-foreground">
          Short, specific guidance for the thing you're about to walk into — grounded
          in your own behavioral profile.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What are you walking into?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. a 1:1 with a skip-level who intimidates me, at 3pm"
            rows={3}
            aria-label="Describe the situation"
          />
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant="secondary"
                onClick={() => setContext(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={isPending || context.trim().length < 3}>
              <Sparkles className="mr-1 h-4 w-4" aria-hidden />
              {isPending ? "Composing…" : "Get a Moment"}
            </Button>
            {isError && (
              <span className="text-sm text-destructive">
                That didn't work. Try again in a moment.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {fresh && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Just now</h2>
          <MomentCard moment={fresh} />
          {fresh.degraded && (
            <p className="text-xs text-muted-foreground">
              This one was composed without the full model pass — ask again for a
              sharper read.
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Your Moments</h2>
        {isLoading ? (
          <div className="space-y-3" data-testid="moments-loading">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !feed || feed.moments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No Moments yet. Describe a situation above and you'll get your first one.
            </CardContent>
          </Card>
        ) : (
          feed.moments.map((moment) => <MomentCard key={moment.id} moment={moment} />)
        )}
      </section>
    </div>
  )
}
