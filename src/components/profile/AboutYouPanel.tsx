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
import { useTranslation } from "react-i18next"

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
  /**
   * Home only (ignored by the `page` variant, so Direction Setting is
   * unchanged). Each callback is supplied by the host ONLY when it has
   * something to show, and the matching pill renders only then: the panel
   * never offers a "View" for an artefact the host could not open.
   */
  homeActions?: AboutYouHomeActions
}

export interface AboutYouHomeActions {
  /** Opens the member's brain map. Turns the survey tile into "Your Scores". */
  onViewScores?: () => void
  /** Opens the member's own PRISM PDF. */
  onViewReport?: () => void
  /** Opens the uploaded résumé. */
  onViewResume?: () => void
  /** Opens the member's bio and personal data. */
  onViewBio?: () => void
}

type TileAction = { label: string; onClick: () => void; testId: string }

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
  /** Home only: an extra pill beside the primary action (a "View …"). */
  extra?: TileAction
  /** Home only: stable hook for the primary action. */
  actionTestId?: string
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
  extra,
  actionTestId,
}: TileProps) {
  const done = state === "done"
  // Home's marks are larger than the Direction Setting page's (request): the
  // tick is the thing a member scans for. The `page` variant keeps its size.
  const markSize = variant === "home" ? "h-5 w-5" : "h-3.5 w-3.5"
  const statusIcon = done ? (
    <Check className={markSize} aria-hidden />
  ) : state === "waiting" ? (
    <Hourglass className={markSize} aria-hidden />
  ) : null

  if (variant === "home") {
    // Home takes the colour themes, so every colour here is an --ig-* token.
    return (
      <div
        data-testid="about-you-tile"
        className={cn(
          "flex h-full flex-col gap-1 rounded-xl border px-3 py-2",
          done ? "border-ig-ok bg-ig-page" : "border-ig-line bg-ig-surface"
        )}
      >
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight text-ig-ink">
          <Icon className="h-3.5 w-3.5 shrink-0 text-ig-accent" aria-hidden />
          {title}
        </h3>
        <p className="line-clamp-2 flex-1 text-[11px] leading-snug text-ig-body">{blurb}</p>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              done ? "font-medium text-ig-ok" : "text-ig-faint"
            )}
          >
            {statusIcon}
            {statusLabel}
          </span>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {extra ? (
              <button
                type="button"
                onClick={extra.onClick}
                data-testid={extra.testId}
                className={cn(
                  "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium",
                  "border border-ig-accent/40 bg-ig-accent/10 text-ig-accent-strong hover:bg-ig-accent/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ig-accent"
                )}
              >
                {extra.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onAction}
              data-testid={actionTestId}
              className={cn(
                "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ig-accent",
                done
                  ? "border border-ig-line bg-ig-surface text-ig-ink hover:bg-ig-page"
                  : "bg-ig-ink text-ig-on-ink hover:bg-ig-ink/90"
              )}
            >
              {actionLabel}
            </button>
          </span>
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

export function AboutYouPanel({
  hasPrism,
  prismUnknown = false,
  prismLoading = false,
  onUploadPrism,
  onUploaded,
  variant = "page",
  homeActions,
}: AboutYouPanelProps) {
  const { t } = useTranslation("accountUi")
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
  // Home-only behaviour. Every one of these is inert for the `page` variant.
  const ha = isHome ? homeActions : undefined

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
        {t("aboutYouPanel.checkingWhatWeAlreadyHave", { defaultValue: "Checking what we already have…" })}
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

  const unknownLabel = t("aboutYouPanel.couldntCheckJustNow", { defaultValue: "Couldn't check just now" })

  const counter =
    doneCount === 0
      ? t("aboutYouPanel.nothingOnFileYetThatsA", { defaultValue: "Nothing on file yet — that's a fine place to start." })
      : t("aboutYouPanel.countOfThreeOnFile", { defaultValue: "{{done}} of 3 on file: PRISM, résumé, bio. Anything you add from here sharpens what comes next.", done: doneCount })

  const hx = (key: string, dv: string) => t(`aboutYouPanel.${key}`, { defaultValue: dv })
  const viewExtra = (
    cb: (() => void) | undefined,
    label: string,
    testId: string
  ): TileAction | undefined => (cb ? { label, onClick: cb, testId } : undefined)
  // The survey tile on Home: scores loaded and openable -> "Your Scores" with a
  // View Scores pill onto the brain map. Anything else keeps the request /
  // in-flight behaviour, so a requested-but-unfinished survey still says so.
  const scoresReady = surveyState === "done" && !!ha?.onViewScores

  const tiles = (
    <section
      aria-label={t("aboutYouPanel.waysToTellUsAboutYou", { defaultValue: "Ways to tell us about you" })}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <Tile
        variant={variant}
        icon={ClipboardList}
        title={
          scoresReady
            ? hx("yourScores", "Your Scores")
            : t("aboutYouPanel.requestYourPrismSurvey", { defaultValue: "Request your PRISM survey" })
        }
        blurb={
          isHome
            ? hx("surveyBlurbShort", "A short questionnaire on how you prefer to work — the anchor for everything else.")
            : t("aboutYouPanel.surveyBlurb", { defaultValue: "A short questionnaire about how you prefer to work. It's the anchor everything else is read against — the single biggest step you can take here." })
        }
        state={surveyState}
        statusLabel={
          surveyState === "done"
            ? t("aboutYouPanel.resultsAreIn", { defaultValue: "Results are in" })
            : surveyState === "waiting"
              ? t("aboutYouPanel.requestedWellPickTheResults", { defaultValue: "Requested — we'll pick the results up automatically" })
              : prismUnresolved
                ? unknownLabel
                : t("aboutYouPanel.notRequestedYet", { defaultValue: "Not requested yet" })
        }
        actionLabel={
          scoresReady
            ? hx("viewScores", "View Scores")
            : surveyState === "todo"
              ? isHome
                ? hx("requestTheSurvey", "Request the Survey")
                : t("aboutYouPanel.requestIt", { defaultValue: "Request it" })
              : t("aboutYouPanel.viewStatus", { defaultValue: "View status" })
        }
        actionTestId="about-you-survey-action"
        onAction={() => (scoresReady ? ha?.onViewScores?.() : navigate(ROUTES.PRISM_ASSESSMENT))}
      />

      <Tile
        variant={variant}
        icon={FileText}
        title={
          isHome
            ? hx("prismReport", "PRISM Report")
            : t("aboutYouPanel.uploadAPrismReportYouAlready", { defaultValue: "Upload a PRISM report you already have" })
        }
        blurb={
          isHome
            ? hx("uploadReportBlurbShort", "Done PRISM elsewhere? Upload the report and we'll read the scores off it.")
            : t("aboutYouPanel.uploadReportBlurb", { defaultValue: "Done PRISM somewhere else? Upload the report and we'll read the scores off it. You get to check what we read before anything is saved." })
        }
        state={hasPrism ? "done" : "todo"}
        statusLabel={
          hasPrism ? t("aboutYouPanel.scoresOnFile", { defaultValue: "Scores on file" }) : prismUnresolved ? unknownLabel : t("aboutYouPanel.nothingUploadedYet", { defaultValue: "Nothing uploaded yet" })
        }
        actionLabel={hasPrism ? t("aboutYouPanel.replaceReport", { defaultValue: "Replace report" }) : t("aboutYouPanel.uploadReport", { defaultValue: "Upload report" })}
        onAction={onUploadPrism}
        actionTestId="about-you-report-action"
        extra={hasPrism ? viewExtra(ha?.onViewReport, hx("viewReport", "View Report"), "about-you-view-report") : undefined}
      />

      <Tile
        variant={variant}
        icon={FileText}
        title={t("aboutYouPanel.uploadYourReSume", { defaultValue: "Upload your résumé" })}
        blurb={
          isHome
            ? hx("resumeBlurbShort", "What you've actually done — real roles and dates to work from.")
            : t("aboutYouPanel.resumeBlurb", { defaultValue: "The record of what you've actually done. It gives the later stages real roles and real dates to work from instead of guesses." })
        }
        state={hasResume ? "done" : "todo"}
        statusLabel={hasResume ? t("aboutYouPanel.onFile", { defaultValue: "On file" }) : profileError ? unknownLabel : t("aboutYouPanel.notAddedYet", { defaultValue: "Not added yet" })}
        actionLabel={hasResume ? t("aboutYouPanel.replaceResume", { defaultValue: "Replace résumé" }) : t("aboutYouPanel.uploadResume", { defaultValue: "Upload résumé" })}
        onAction={() => setPersonalTarget({ name: t("aboutYouPanel.resume", { defaultValue: "Résumé" }), docKind: "resume" })}
        actionTestId="about-you-resume-action"
        extra={hasResume ? viewExtra(ha?.onViewResume, hx("viewResume", "View Resume"), "about-you-view-resume") : undefined}
      />

      <Tile
        variant={variant}
        icon={UserRound}
        title={
          isHome
            ? hx("addBioAndPersonalData", "Add a bio and personal data")
            : t("aboutYouPanel.addABio", { defaultValue: "Add a bio" })
        }
        blurb={
          isHome
            ? hx("bioBlurbShort", "A few lines in your own words — the quickest of the four.")
            : t("aboutYouPanel.bioBlurb", { defaultValue: "A few lines in your own words. How you'd describe yourself is a signal in its own right, and it's the quickest of the four." })
        }
        state={hasBio ? "done" : "todo"}
        statusLabel={hasBio ? t("aboutYouPanel.onFile", { defaultValue: "On file" }) : profileError ? unknownLabel : t("aboutYouPanel.notAddedYet", { defaultValue: "Not added yet" })}
        actionLabel={hasBio ? t("aboutYouPanel.updateBio", { defaultValue: "Update bio" }) : t("aboutYouPanel.addBio", { defaultValue: "Add bio" })}
        onAction={() => setPersonalTarget({ name: t("aboutYouPanel.bio", { defaultValue: "Bio" }), docKind: "bio" })}
        actionTestId="about-you-bio-action"
        extra={viewExtra(ha?.onViewBio, hx("viewBioAndData", "View Bio and Data"), "about-you-view-bio")}
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
      aria-label={t("aboutYouPanel.whatsInYourProfile", { defaultValue: "Here's what's in your profile" })}
      className="ig-tile rounded-2xl border border-ig-line bg-ig-surface px-5 py-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ig-ink">{t("aboutYouPanel.whatsInYourProfile", { defaultValue: "Here's what's in your profile" })}</h2>
        {allOnFile ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-ig-accent hover:text-ig-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ig-accent"
          >
            {collapsed ? t("aboutYouPanel.show", { defaultValue: "Show" }) : t("aboutYouPanel.hide", { defaultValue: "Hide" })}
          </button>
        ) : null}
      </div>
      {collapsed ? (
        <p data-testid="about-you-collapsed" className="mt-1 text-sm text-ig-body">
          {t("aboutYouPanel.prismReSumeAndBioAre", { defaultValue: "PRISM, résumé and bio are on file." })}
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

