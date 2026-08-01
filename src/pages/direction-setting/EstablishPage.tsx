import { useMemo, useState, type ComponentType } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  Check,
  ClipboardList,
  FileText,
  Hourglass,
  Loader2,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import {
  AddPersonalDocModal,
  type AddPersonalDocTarget,
} from "@/components/dashboard/v2/AddPersonalDocModal"
import {
  AddAssessmentModal,
  type AddAssessmentTarget,
} from "@/components/dashboard/v2/AddAssessmentModal"
import { useLoadedFrameworks, useMyProfile } from "@/hooks/profile/useProfile"
import { useLatestPrismStatus } from "@/hooks/prism/usePrismRequest"
import { useAdvanceJourney } from "@/hooks/direction-setting/useJourney"

/**
 * Stages 0–1 — "what do you know about me?"
 *
 * Four ways to tell us who you are, and **not one of them blocks anything**.
 * That is the whole design. A person arriving here is often between jobs and
 * has already been told "no" by a dozen forms; a page that refuses to proceed
 * until it has a PRISM report is the fastest way to lose them. Every later
 * stage runs on whatever is here — thinner with less, but it runs.
 *
 * Two reuses worth preserving:
 *
 * 1. **The upload modals are the dashboard&apos;s**, not copies. `AddPersonalDocModal`
 *    tags the file with the right `doc_kind` so the profile loader can fold a
 *    résumé/bio into `<USER_PROFILE>`; `AddAssessmentModal` parses a report and
 *    shows the extracted scores for review *before* anything is written. Both
 *    behaviours are load-bearing and neither is worth reimplementing here.
 * 2. **The PRISM survey is requested where it has always been requested**
 *    (`/prism-assessment`). This page reads the request&apos;s status and links
 *    across; it does not open a second door onto the same integration.
 */

/** Done state for a tile. `waiting` is real progress, so it is not `todo`. */
type TileState = "done" | "waiting" | "todo"

type TileProps = {
  icon: ComponentType<{ className?: string }>
  title: string
  /** What this buys the user — never what they are missing. */
  blurb: string
  state: TileState
  /** Shown instead of the action when the tile is done or in flight. */
  statusLabel: string
  actionLabel: string
  onAction: () => void
}

function Tile({
  icon: Icon,
  title,
  blurb,
  state,
  statusLabel,
  actionLabel,
  onAction,
}: TileProps) {
  const done = state === "done"
  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        done ? "border-emerald-200 bg-emerald-50/40" : undefined
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="text-sm text-muted-foreground">{blurb}</p>

        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              done ? "text-emerald-700" : "text-muted-foreground"
            )}
          >
            {done ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ) : state === "waiting" ? (
              <Hourglass className="h-3.5 w-3.5" aria-hidden />
            ) : null}
            {statusLabel}
          </span>

          <Button
            type="button"
            size="sm"
            variant={done ? "outline" : "default"}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function EstablishPage() {
  const navigate = useNavigate()

  // The dashboard's two upload modals are driven by a target object; `null`
  // means closed. Same contract as HomeV2 — see that page for the original.
  const [personalTarget, setPersonalTarget] = useState<AddPersonalDocTarget | null>(
    null
  )
  const [assessmentTarget, setAssessmentTarget] = useState<AddAssessmentTarget | null>(
    null
  )

  const prism = useLatestPrismStatus()
  const { data: loadedFrameworks = [], isLoading: frameworksLoading } =
    useLoadedFrameworks()
  const { data: profile, isLoading: profileLoading } = useMyProfile()
  const advance = useAdvanceJourney()

  const loadedSet = useMemo(
    () => new Set(loadedFrameworks.map((f) => f.toUpperCase())),
    [loadedFrameworks]
  )
  const personalSet = useMemo(
    () => new Set((profile?.personal_docs ?? []).map((k) => k.toLowerCase())),
    [profile]
  )

  const hasPrismScores = loadedSet.has("PRISM")
  const hasResume = personalSet.has("resume") || personalSet.has("cv")
  const hasBio = personalSet.has("bio")

  /**
   * Anything landing here moves the journey on. Fire-and-forget: the mutation
   * invalidates the journey query, and a failure to record progress must never
   * cost the user the upload they just made — the file is already saved.
   */
  const recordProgress = (): void => {
    advance.mutate({ stageId: "1", state: "complete" })
  }

  const loading = prism.isLoading || frameworksLoading || profileLoading

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Checking what we already have…
        </div>
      </div>
    )
  }

  // A survey that has been requested but hasn't come back yet is progress, and
  // saying so beats showing an untouched tile to someone who has done the work.
  const surveyState: TileState = hasPrismScores
    ? "done"
    : prism.latest
      ? "waiting"
      : "todo"

  const doneCount = [hasPrismScores, hasResume, hasBio].filter(Boolean).length

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">What we know about you</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Four ways to tell us who you are. None of them is required and none of them
          holds anything up — everything further along works with whatever you give it,
          and gets sharper as you add more. Do one now and the rest whenever.
        </p>
      </header>

      <p className="text-sm text-muted-foreground">
        {doneCount === 0
          ? "Nothing on file yet — that's a fine place to start."
          : `${doneCount} of 3 on file. Anything you add from here sharpens what comes next.`}
      </p>

      <section aria-label="Ways to tell us about you" className="grid gap-4 sm:grid-cols-2">
        <Tile
          icon={ClipboardList}
          title="Request your PRISM survey"
          blurb="A short questionnaire about how you prefer to work. It's the anchor everything else is read against — the single biggest step you can take here."
          state={surveyState}
          statusLabel={
            surveyState === "done"
              ? "Results are in"
              : surveyState === "waiting"
                ? "Requested — we'll pick the results up automatically"
                : "Not requested yet"
          }
          actionLabel={surveyState === "todo" ? "Request it" : "View status"}
          onAction={() => navigate(ROUTES.PRISM_ASSESSMENT)}
        />

        <Tile
          icon={FileText}
          title="Upload a PRISM report you already have"
          blurb="Done PRISM somewhere else? Upload the report and we'll read the scores off it. You get to check what we read before anything is saved."
          state={hasPrismScores ? "done" : "todo"}
          statusLabel={hasPrismScores ? "Scores on file" : "Nothing uploaded yet"}
          actionLabel={hasPrismScores ? "Replace report" : "Upload report"}
          onAction={() =>
            setAssessmentTarget({ name: "your PRISM report", framework: "PRISM" })
          }
        />

        <Tile
          icon={FileText}
          title="Upload your résumé"
          blurb="The record of what you've actually done. It gives the later stages real roles and real dates to work from instead of guesses."
          state={hasResume ? "done" : "todo"}
          statusLabel={hasResume ? "On file" : "Not added yet"}
          actionLabel={hasResume ? "Replace résumé" : "Upload résumé"}
          onAction={() => setPersonalTarget({ name: "Résumé", docKind: "resume" })}
        />

        <Tile
          icon={UserRound}
          title="Add a bio"
          blurb="A few lines in your own words. How you'd describe yourself is a signal in its own right, and it's the quickest of the four."
          state={hasBio ? "done" : "todo"}
          statusLabel={hasBio ? "On file" : "Not added yet"}
          actionLabel={hasBio ? "Update bio" : "Add bio"}
          onAction={() => setPersonalTarget({ name: "Bio", docKind: "bio" })}
        />
      </section>

      <footer className="border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.DIRECTION_SETTING.PORTRAIT)}
        >
          Go on to your portrait
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">
          You can carry on without any of this. The portrait will simply say what it
          can, and tell you what it couldn&apos;t see.
        </p>
      </footer>

      {/* Reused wholesale from the dashboard — see the note at the top of the file. */}
      <AddPersonalDocModal
        target={personalTarget}
        onOpenChange={(open) => {
          if (!open) setPersonalTarget(null)
        }}
        onUploaded={recordProgress}
      />

      <AddAssessmentModal
        target={assessmentTarget}
        onOpenChange={(open) => {
          if (!open) setAssessmentTarget(null)
        }}
        onImported={recordProgress}
      />
    </div>
  )
}
