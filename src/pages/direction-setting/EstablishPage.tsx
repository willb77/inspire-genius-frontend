import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import {
  AddAssessmentModal,
  type AddAssessmentTarget,
} from "@/components/dashboard/v2/AddAssessmentModal"
import { AboutYouPanel } from "@/components/profile/AboutYouPanel"
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
 * The four boxes are `AboutYouPanel` (HOME-1), shared with Home. This page
 * supplies the three things that are its own: the PRISM upload path, what
 * "has PRISM" means, and recording journey progress after an upload.
 *
 * Two reuses worth preserving:
 *
 * 1. **The upload modals are the dashboard&apos;s**, not copies. `AddPersonalDocModal`
 *    (inside the panel) tags the file with the right `doc_kind` so the profile
 *    loader can fold a résumé/bio into `<USER_PROFILE>`; `AddAssessmentModal`
 *    parses a report and shows the extracted scores for review *before*
 *    anything is written. Both behaviours are load-bearing and neither is
 *    worth reimplementing here.
 * 2. **The PRISM survey is requested where it has always been requested**
 *    (`/prism-assessment`). The panel reads the request&apos;s status and links
 *    across; it does not open a second door onto the same integration.
 */
export default function EstablishPage() {
  const navigate = useNavigate()

  // The assessment modal is driven by a target object; `null` means closed.
  // Same contract as the dashboard.
  const [assessmentTarget, setAssessmentTarget] = useState<AddAssessmentTarget | null>(
    null
  )

  const prism = useLatestPrismStatus()
  const { data: loadedFrameworks = [], isLoading: frameworksLoading } =
    useLoadedFrameworks()
  const { isLoading: profileLoading } = useMyProfile()
  const advance = useAdvanceJourney()

  const loadedSet = useMemo(
    () => new Set(loadedFrameworks.map((f) => f.toUpperCase())),
    [loadedFrameworks]
  )

  const hasPrismScores = loadedSet.has("PRISM")

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

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold">What we know about you</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Four ways to tell us who you are. None of them is required and none of them
          holds anything up — everything further along works with whatever you give it,
          and gets sharper as you add more. Do one now and the rest whenever.
        </p>
      </header>

      <AboutYouPanel
        variant="page"
        hasPrism={hasPrismScores}
        onUploadPrism={() =>
          setAssessmentTarget({ name: "your PRISM report", framework: "PRISM" })
        }
        onUploaded={recordProgress}
      />

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
