import { useMemo, useState, type ComponentType } from "react"
import { useNavigate } from "react-router-dom"
import { Check, ClipboardList, FileText, Hourglass, Loader2, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import {
  AddPersonalDocModal,
  type AddPersonalDocTarget,
} from "@/components/dashboard/v2/AddPersonalDocModal"
import { useMyProfile } from "@/hooks/profile/useProfile"
import { useLatestPrismStatus } from "@/hooks/prism/usePrismRequest"

/**
 * "What we know about you": four ways to tell IG who you are (request the
 * PRISM survey, upload a PRISM report, upload a résumé, add a bio).
 *
 * HOME-1 (CSA docs/analysis/2026-10-22-home-1-about-you-panel-on-home-csa.md):
 * ONE component, used by Direction Setting's Establish stage and, behind the
 * `home_about_you_panel` switch, by Home. It was extracted from EstablishPage
 * so that the two pages cannot drift apart.
 *
 * What the HOST decides, and why the panel must not:
 *
 * - **How PRISM is uploaded** (`onUploadPrism`). The two pages use different
 *   paths that write different tables. Direction Setting uses
 *   `AddAssessmentModal` (`import/confirm`). Home uses `ReplacePrismDataDialog`
 *   (`/v1/prism/report/me/replace`), which projects into `prism_results`. A
 *   shared panel must not quietly move a page from one path to the other.
 * - **What "has PRISM" means** (`hasPrism`). Each page keeps its own fact
 *   (HOME-F2, not settled here).
 * - **What happens after an upload** (`onUploaded`). Direction Setting records
 *   journey progress. Home records nothing. Nothing in this file calls a
 *   direction-setting API, because an account without that entitlement would
 *   get a 403 after a successful upload.
 *
 * The panel owns the résumé and bio done-states (`GET /me personal_docs`), the
 * survey's "waiting" state, and the résumé/bio upload modal. Those are the
 * same on both pages.
 */

/** Done state for a tile. `waiting` is real progress, so it is not `todo`. */
type TileState = "done" | "waiting" | "todo"

/**
 * `page` is Direction Setting: the original look, unchanged.
 * `home` is themed with `--ig-*` tokens only (Home is a THEMED_PATH), has its
 * own heading, and collapses to one line when everything is on file.
 */
export type AboutYouPanelVariant = "page" | "home"

export interface AboutYouPanelProps {
  /** The host's own "has PRISM" fact. */
  hasPrism: boolean
  /** The host could not determine `hasPrism` (a failed read, not a "no"). */
  prismUnknown?: boolean
  /** The host is still loading `hasPrism`. */
  prismLoading?: boolean
  /** Opens the host's own PRISM upload path. */
  onUploadPrism: () => void
  /** Called after a résumé or bio upload succeeds. */
  onUploaded?: () => void
  variant?: AboutYouPanelVariant
}

type TileProps = {
  icon: ComponentType<{ className?: string }>
  title: string
  /** What this buys the user, never what they are missing. */
  blurb: string
  state: TileState
  /** Shown instead of the action when the tile is done or in flight. */
  statusLabel: string
  actionLabel: string
  onAction: () => void
  variant: AboutYouPanelVariant
}

function Tile({
  icon: Icon,
  title,
  blurb,
  state,
  statusLabel,
  actionLabel,
  onAction,
  variant,
}: TileProps) {
  const done = state === "done"
  const statusIcon = done ? (
    <Check className="h-3.5 w-3.5" aria-hidden />
  ) : state === "waiting" ? (
    <Hourglass className="h-3.5 w-3.5" aria-hidden />
  ) : null

  if (variant === "home") {
    // Home takes the colour themes, so every colour here is an --ig-* token.
    return (
      <div
        data-testid="about-you-tile"
        className={cn(
          "flex h-full flex-col gap-2 rounded-xl border px-4 py-3",
          done ? "border-ig-ok bg-ig-page" : "border-ig-line bg-ig-surface"
        )}
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ig-ink">
          <Icon className="h-4 w-4 shrink-0 text-ig-accent" aria-hidden />
          {title}
        </h3>
        <p className="flex-1 text-xs leading-relaxed text-ig-body">{blurb}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              done ? "text-ig-ok" : "text-ig-faint"
            )}
          >
            {statusIcon}
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={onAction}
            className={cn(
              "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ig-accent",
              done
                ? "border border-ig-line bg-ig-surface text-ig-ink hover:bg-ig-page"
                : "bg-ig-ink text-ig-on-ink hover:bg-ig-ink/90"
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-0 py-3",
        done ? "border-emerald-200 bg-emerald-50/40" : undefined
      )}
    >
      <CardHeader className="px-4 pb-1.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-2 px-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{blurb}</p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              done ? "text-emerald-700" : "text-muted-foreground"
            )}
          >
            {statusIcon}
            {statusLabel}
          </span>

          <Button
            type="button"
            size="sm"
            className="h-7 px-2.5 text-xs"
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

const UNKNOWN_LABEL = "Couldn't check just now"

export function AboutYouPanel({
  hasPrism,
  prismUnknown = false,
  prismLoading = false,
  onUploadPrism,
  onUploaded,
  variant = "page",
}: AboutYouPanelProps) {
  const navigate = useNavigate()
  const [personalTarget, setPersonalTarget] = useState<AddPersonalDocTarget | null>(null)
  const [expanded, setExpanded] = useState(false)

  const prism = useLatestPrismStatus()
  const { data: profile, isLoading: profileLoading, isError: profileError } = useMyProfile()

  const personalSet = useMemo(
    () => new Set((profile?.personal_docs ?? []).map((k) => k.toLowerCase())),
    [profile]
  )
  const hasResume = personalSet.has("resume") || personalSet.has("cv")
  const hasBio = personalSet.has("bio")
  const isHome = variant === "home"

  const modal = (
    <AddPersonalDocModal
      target={personalTarget}
      onOpenChange={(open) => {
        if (!open) setPersonalTarget(null)
      }}
      onUploaded={onUploaded}
    />
  )

  if (prismLoading || prism.isLoading || profileLoading) {
    return (
      <div
        data-testid="about-you-loading"
        className={cn(
          "flex items-center gap-2 text-sm",
          isHome ? "text-ig-body" : "text-muted-foreground"
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Checking what we already have…
      </div>
    )
  }

  const prismUnresolved = !hasPrism && prismUnknown
  // A survey that has been requested but hasn't come back yet is progress, and
  // saying so beats showing an untouched tile to someone who has done the work.
  const surveyState: TileState = hasPrism ? "done" : prism.latest ? "waiting" : "todo"
  const doneCount = [hasPrism, hasResume, hasBio].filter(Boolean).length
  const allOnFile = hasPrism && hasResume && hasBio && !profileError
  const collapsed = isHome && allOnFile && !expanded

  const counter =
    doneCount === 0
      ? "Nothing on file yet — that's a fine place to start."
      : `${doneCount} of 3 on file: PRISM, résumé, bio. Anything you add from here sharpens what comes next.`

  const tiles = (
    <section
      aria-label="Ways to tell us about you"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <Tile
        variant={variant}
        icon={ClipboardList}
        title="Request your PRISM survey"
        blurb="A short questionnaire about how you prefer to work. It's the anchor everything else is read against — the single biggest step you can take here."
        state={surveyState}
        statusLabel={
          surveyState === "done"
            ? "Results are in"
            : surveyState === "waiting"
              ? "Requested — we'll pick the results up automatically"
              : prismUnresolved
                ? UNKNOWN_LABEL
                : "Not requested yet"
        }
        actionLabel={surveyState === "todo" ? "Request it" : "View status"}
        onAction={() => navigate(ROUTES.PRISM_ASSESSMENT)}
      />

      <Tile
        variant={variant}
        icon={FileText}
        title="Upload a PRISM report you already have"
        blurb="Done PRISM somewhere else? Upload the report and we'll read the scores off it. You get to check what we read before anything is saved."
        state={hasPrism ? "done" : "todo"}
        statusLabel={
          hasPrism ? "Scores on file" : prismUnresolved ? UNKNOWN_LABEL : "Nothing uploaded yet"
        }
        actionLabel={hasPrism ? "Replace report" : "Upload report"}
        onAction={onUploadPrism}
      />

      <Tile
        variant={variant}
        icon={FileText}
        title="Upload your résumé"
        blurb="The record of what you've actually done. It gives the later stages real roles and real dates to work from instead of guesses."
        state={hasResume ? "done" : "todo"}
        statusLabel={hasResume ? "On file" : profileError ? UNKNOWN_LABEL : "Not added yet"}
        actionLabel={hasResume ? "Replace résumé" : "Upload résumé"}
        onAction={() => setPersonalTarget({ name: "Résumé", docKind: "resume" })}
      />

      <Tile
        variant={variant}
        icon={UserRound}
        title="Add a bio"
        blurb="A few lines in your own words. How you'd describe yourself is a signal in its own right, and it's the quickest of the four."
        state={hasBio ? "done" : "todo"}
        statusLabel={hasBio ? "On file" : profileError ? UNKNOWN_LABEL : "Not added yet"}
        actionLabel={hasBio ? "Update bio" : "Add bio"}
        onAction={() => setPersonalTarget({ name: "Bio", docKind: "bio" })}
      />
    </section>
  )

  if (!isHome) {
    // Direction Setting: the page supplies its own heading, intro and footer.
    return (
      <>
        <p className="text-sm text-muted-foreground">{counter}</p>
        {/* Four across on a wide screen so the whole set is above the fold — the
            point of this page is that you can see all four options at once and
            pick one, and a 2×2 that ran off the bottom hid half the choices. */}
        {tiles}
        {modal}
      </>
    )
  }

  return (
    <section
      data-testid="home-about-you-panel"
      aria-label="What we know about you"
      className="ig-tile rounded-2xl border border-ig-line bg-ig-surface px-5 py-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ig-ink">What we know about you</h2>
        {allOnFile ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-ig-accent hover:text-ig-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ig-accent"
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        ) : null}
      </div>
      {collapsed ? (
        <p data-testid="about-you-collapsed" className="mt-1 text-sm text-ig-body">
          PRISM, résumé and bio are on file.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-ig-body">{counter}</p>
          {tiles}
        </div>
      )}
      {modal}
    </section>
  )
}

