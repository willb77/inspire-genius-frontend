import { useMemo, useState } from "react"
import { Bookmark, Check, Pin, Sparkles, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAskMoment, useMoments, useSetMomentState } from "@/hooks/lumen/useMoments"
import {
  useCreateSavedPrompt,
  useDeleteSavedPrompt,
  useSavedPrompts,
  useTouchSavedPrompt,
} from "@/hooks/lumen/useSavedPrompts"
import type { Moment, MomentState, SavedPrompt } from "@/types/lumen"

/**
 * "Moments" — just-in-time guidance at the point of use.
 *
 * Two halves: an ask box for the situation in front of you, and the feed of
 * everything generated so far (including proactive Moments once the scheduler
 * ships). The ask box is deliberately the top of the page — the pull path is
 * the one a user can rely on today.
 *
 * **On recall.** The guidance is already recallable: every ask is stored as a
 * Moment carrying both the situation and the answer, and the feed below is that
 * record. What the feed can't do is make a *recurring* situation cheap to ask
 * again — so the ask box also carries the user's own saved situations, kept
 * deliberately, sitting alongside the built-in presets.
 *
 * **On the history picker.** The feed is chronological and unbounded-looking,
 * which is fine at five Moments and useless at fifty — the one you want is the
 * one you can no longer scroll to. The picker names Moments by *situation*
 * rather than by date or id, because that is what a user recognises. It filters
 * the list already on the page rather than fetching: the feed is the history,
 * and a second endpoint would be a second source of truth for the same rows.
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

/**
 * How many Moments the history picker can reach.
 *
 * The feed's own default is 20. A picker that silently stops at twenty would be
 * a worse lie than no picker — it presents itself as "your history".
 */
const HISTORY_LIMIT = 50

/** Sentinel for "don't filter". A real id can never collide with it. */
const ALL = "__all__"

/**
 * One line identifying a Moment in the picker.
 *
 * The situation is what the user recognises — they remember asking about the
 * skip-level, not that it was a `pull` on the 9th. Proactive Moments have no
 * situation, so they fall back to their trigger. The date disambiguates the
 * same situation asked twice, which is exactly the case a picker exists for.
 */
function momentLabel(moment: Moment): string {
  const when = moment.created_at
    ? new Date(moment.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null
  const what = moment.context?.trim() || TRIGGER_LABEL[moment.trigger]
  const trimmed = what.length > 70 ? `${what.slice(0, 69).trimEnd()}…` : what
  return when ? `${when} — ${trimmed}` : trimmed
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

/**
 * The user's own kept situations.
 *
 * Rendered above the built-in presets because they're better: a situation
 * someone chose to keep is, by definition, one they walk into. Each carries its
 * own remove control rather than a separate edit mode — an unpinned situation
 * loses nothing, since the Moments it produced stay in the feed.
 */
function SavedSituations({
  prompts,
  onPick,
  onRemove,
  removing,
}: {
  prompts: SavedPrompt[]
  onPick: (p: SavedPrompt) => void
  onRemove: (id: string) => void
  removing: boolean
}) {
  if (prompts.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Your pinned situations</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center overflow-hidden rounded-md border bg-background"
          >
            <button
              type="button"
              onClick={() => onPick(p)}
              className="px-2.5 py-1.5 text-sm hover:bg-muted"
            >
              {p.label || p.text}
            </button>
            <button
              type="button"
              aria-label={`Remove "${p.label || p.text}"`}
              disabled={removing}
              onClick={() => onRemove(p.id)}
              className="border-l px-1.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

export interface MomentsProps {
  /**
   * Render for embedding inside a host tile (Home's "Today's Prep") rather than
   * as a standalone page: drops the page `<h1>`/description and the outer page
   * padding, because the host supplies both and two headings stacked reads as a
   * bug.
   *
   * A variant rather than a copy: the ask box, saved situations, presets and
   * feed are the same behaviour in both places, and a duplicate would drift the
   * first time either side changed.
   */
  embedded?: boolean
}

export default function Moments({ embedded = false }: MomentsProps = {}) {
  const [context, setContext] = useState("")
  const [selected, setSelected] = useState<string>(ALL)
  const { data: feed, isLoading } = useMoments(HISTORY_LIMIT)
  const { mutate: ask, data: fresh, isPending, isError } = useAskMoment()

  // `isError` here means the environment's agent-engine predates the
  // saved-prompts routes (404). Pinning is then hidden entirely rather than
  // offered and silently failing — the frontend deploys to dev AND staging-B
  // on merge, while the backend is promoted separately, so the two genuinely
  // do run out of step.
  const { data: saved = [], isError: pinningUnavailable } = useSavedPrompts()
  const { mutate: savePrompt, isPending: isSaving } = useCreateSavedPrompt()
  const { mutate: removePrompt, isPending: isRemoving } = useDeleteSavedPrompt()
  const { mutate: touchPrompt } = useTouchSavedPrompt()

  const trimmed = context.trim()
  // "Pin", not "Save": the Moment cards already have a Save, and it means
  // something different (keep this piece of guidance). Nothing to pin if it's
  // too short, or already pinned — re-saving is a no-op server-side, but an
  // enabled button implies it would do something.
  const alreadyPinned = saved.some((p) => p.text === trimmed.replace(/\s+/g, " "))
  const canPin = trimmed.length >= 3 && !alreadyPinned && !pinningUnavailable

  const submit = () => {
    if (trimmed.length < 3) return
    ask({ context: trimmed })
    setContext("")
  }

  const moments = useMemo(() => feed?.moments ?? [], [feed])
  // A selected Moment that no longer exists (asked again, feed refetched, the
  // id fell off the end of the window) must not blank the section — fall back
  // to showing everything rather than rendering an empty list under a picker
  // that still names the missing one.
  const shown = useMemo(() => {
    if (selected === ALL) return moments
    const one = moments.find((m) => m.id === selected)
    return one ? [one] : moments
  }, [moments, selected])

  const pickSaved = (p: SavedPrompt) => {
    setContext(p.text)
    // Ordering only — the ask itself must not wait on a counter, and a failed
    // bump is a slightly stale list, not a lost Moment.
    touchPrompt(p.id)
  }

  return (
    <div className={embedded ? "space-y-4" : "space-y-6 p-6"}>
      {!embedded && (
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Moments</h1>
          <p className="max-w-2xl text-muted-foreground">
            Short, specific guidance — grounded in your own behavioral profile.
          </p>
        </header>
      )}

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
          <SavedSituations
            prompts={saved}
            onPick={pickSaved}
            onRemove={removePrompt}
            removing={isRemoving}
          />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Common situations</p>
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
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={isPending || trimmed.length < 3}>
              <Sparkles className="mr-1 h-4 w-4" aria-hidden />
              {isPending ? "Composing…" : "Get a Moment"}
            </Button>
            {!pinningUnavailable && (
              <Button
                variant="outline"
                disabled={!canPin || isSaving}
                onClick={() => savePrompt({ text: trimmed })}
              >
                <Pin className="mr-1 h-4 w-4" aria-hidden />
                {alreadyPinned ? "Pinned" : "Pin this situation"}
              </Button>
            )}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Your Moments</h2>
          {/* Only worth a picker once there is something to pick between. */}
          {moments.length > 1 && (
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger
                className="h-8 w-full max-w-xs text-sm sm:w-72"
                aria-label="Choose a Moment from your history"
              >
                <SelectValue placeholder="All Moments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Moments ({moments.length})</SelectItem>
                {moments.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {momentLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3" data-testid="moments-loading">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : moments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No Moments yet. Describe a situation above and you'll get your first one.
            </CardContent>
          </Card>
        ) : (
          <>
            {shown.map((moment) => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
            {selected !== ALL && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setSelected(ALL)}
              >
                Show all {moments.length} Moments
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
