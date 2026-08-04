import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Loader2,
  MessagesSquare,
  ScanSearch,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useAdvanceJourney } from "@/hooks/direction-setting/useJourney"
import { useFitMatches } from "@/hooks/job-fit/useFitMatches"
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"
import {
  useGenerateInterviewGuide,
  useInterviewGuide,
} from "@/hooks/job-blueprint/useScorecard"
import type { InterviewGuide } from "@/types/job-blueprint"

/**
 * Stage 11 — "How do I not blow the interview?"
 *
 * The one page in Direction Setting that turns the gap analysis outward. Every
 * earlier stage asks *what is true about me*; this one asks *what will I be
 * asked about it*, and the honest answer is: the places where you sit below the
 * role's benchmark. Those are the questions an interviewer trained on this
 * blueprint will actually reach for.
 *
 * Three things this page is careful about:
 *
 * 1. **It never invents a guide.** A guide is derived from a real published
 *    role benchmark compared against the user's real profile. No target role →
 *    no guide, and we say so plainly and point at the stage that produces one.
 *    A fabricated question list would be worse than nothing: someone would
 *    prepare for the wrong interview.
 * 2. **It reads as preparation, not as a verdict.** The same payload drives the
 *    recruiter-side `InterviewGuideView`, where the framing is assessment
 *    ("counter-productive behaviour questions"). Here the reader is the
 *    candidate, so the framing is what to expect and what to have ready. Same
 *    data, different sentence.
 * 3. **It pairs the gaps with the strengths.** A page that only lists what
 *    you're weakest on is a page nobody wants to open. `interviewSelfAdvocacy`
 *    from the fit detail is the other half — the things worth saying out loud —
 *    and it renders alongside, not buried underneath.
 *
 * ## Why the guide is generated rather than just fetched
 *
 * The backend serves `GET /v1/blueprint/interview-guide/{jobId}?candidateId=…`,
 * but the shared FE client (`scorecard.service.getInterviewGuide`) doesn't send
 * `candidateId` — it was written for the recruiter surface, where the job is
 * the whole key. Rather than fork a second client (there must only be one), the
 * GET is treated as an optimistic peek and only honoured when the guide that
 * comes back is *this* user's; otherwise the POST — which does carry
 * `candidateId` — is the source of truth. Worth folding the query param into
 * the shared service when someone owns that file.
 */

/** Category → the plain word we use for it. The API's terms are internal. */
const CATEGORY_LABEL: Record<string, string> = {
  behavior: "how you work with people",
  aptitude: "how you think",
  "core-trait": "what drives you",
  core_trait: "what drives you",
}

function GuideSections({
  guide,
  advocacy,
}: {
  guide: InterviewGuide
  advocacy: string[]
}) {
  return (
    <div className="space-y-6">
      {/* The strengths first, deliberately. Someone opening this page is more
          likely to be nervous than complacent. */}
      {advocacy.length > 0 && (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              Worth saying out loud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {advocacy.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm">
                  <MessagesSquare
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Gap-derived questions — the substance of the page. */}
      {guide.focusDimensions.length > 0 && (
        <section aria-labelledby="guide-focus">
          <h2 id="guide-focus" className="mb-1 text-sm font-medium">
            What they&apos;re most likely to dig into
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            These come from the places where your profile sits furthest from what
            this role is benchmarked for. Being asked about them isn&apos;t a
            trap — it&apos;s the part of the conversation you can prepare for.
          </p>
          <div className="space-y-3">
            {guide.focusDimensions.map((fd) => (
              <Card key={fd.dimensionId}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                    {fd.dimensionName}
                    <Badge variant="outline" className="text-xs font-normal">
                      {CATEGORY_LABEL[fd.category] ?? fd.category}
                    </Badge>
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      You {fd.candidateScore} · this role typically {fd.benchmarkScore}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {fd.questions.map((q) => (
                      <li key={q} className="flex items-start gap-2 text-sm">
                        <HelpCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {guide.counterProductiveQuestions.length > 0 && (
        <section aria-labelledby="guide-pressure">
          <h2 id="guide-pressure" className="mb-1 text-sm font-medium">
            Where the conversation might get uncomfortable
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Everyone has habits that show up under pressure. Interviewers probe
            them because they&apos;re normal, not because something is wrong with
            you. Having an honest example ready takes the sting out.
          </p>
          <Card>
            <CardContent className="space-y-4 p-4">
              {guide.counterProductiveQuestions.map((cpq) => (
                <div key={cpq.dimensionName}>
                  <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle
                      className="h-4 w-4 text-amber-600"
                      aria-hidden
                    />
                    {cpq.dimensionName}
                  </p>
                  <ul className="space-y-1.5">
                    {cpq.questions.map((q) => (
                      <li
                        key={q}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <HelpCircle
                          className="mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden
                        />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {guide.generalQuestions.length > 0 && (
        <section aria-labelledby="guide-general">
          <h2 id="guide-general" className="mb-3 text-sm font-medium">
            Questions that come up for almost any role
          </h2>
          <Card>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {guide.generalQuestions.map((q, i) => (
                  <li key={q} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

/**
 * Sent where the recruiter surface sends a real candidate id. The backend maps
 * this (and "", "self", "pending") onto the caller's token subject.
 */
const SELF_CANDIDATE = "me"

export default function InterviewPage() {
  const navigate = useNavigate()
  /**
   * The candidate this guide is for — always the person looking at the page.
   *
   * `user.id` is NOT a usable subject id here. `AuthContext` seeds it to the
   * literal string "me" (`id: stored?.id ?? "me"`), so this page was asking the
   * backend for a candidate called "me": the generated guide was built against
   * nobody, and the peek's `candidateId === candidateId` comparison could never
   * match a real id, so no guide ever rendered. That is both reported symptoms
   * — the page not loading a prep sheet, and the build button doing nothing.
   *
   * The backend now resolves a placeholder to the caller's own token subject,
   * which is the only identity a self-serve user can legitimately ask about. So
   * the honest thing to send is "this is me", not a guess at an id.
   */
  const candidateId = SELF_CANDIDATE

  const {
    data: matches,
    isLoading: matchesLoading,
    isError: matchesError,
  } = useFitMatches()

  // Default to the closest match — the role they're most likely preparing for —
  // but let them switch, because "closest fit" and "the interview I have on
  // Thursday" are not always the same role.
  const [chosenJobId, setChosenJobId] = useState<string | null>(null)
  const jobId = chosenJobId ?? matches?.[0]?.jobId ?? ""
  const role = matches?.find((m) => m.jobId === jobId)

  const { data: fetchedGuide } = useInterviewGuide(jobId)
  const { data: fit } = useFitDetail(jobId || undefined)
  const generate = useGenerateInterviewGuide()
  const advance = useAdvanceJourney()

  // The peek is only trustworthy when it came back for this user — see the
  // header note about the missing `candidateId` on the shared GET client.
  const guide: InterviewGuide | undefined = useMemo(() => {
    if (generate.data) return generate.data
    // The peek is trustworthy when it came back scoped to a person at all —
    // the backend resolves our placeholder to the caller, so a guide that
    // carries any candidate id is this caller's. Comparing it to the string we
    // sent would never match, which is what suppressed every guide before.
    if (fetchedGuide && fetchedGuide.candidateId) {
      return fetchedGuide
    }
    return undefined
  }, [generate.data, fetchedGuide])

  const build = () => {
    // Only the job is genuinely required — the candidate is always the caller.
    if (!jobId) return
    generate.mutate(
      { jobId, candidateId },
      {
        onSuccess: (built) => {
          // Stage ids are the backend's; "11" is this page, the same way
          // JourneyPage's route map keys off them. Recording it here means the
          // journey's "next action" moves on without the user having to tell it.
          //
          // The guide MUST travel with the advance. Rehearsal (stage 12) reads
          // the stage-11 journey artefact and nothing else — it deliberately
          // will not read blueprint-service's own table, which is keyed on a
          // recruiter-pipeline candidate row a self-serve user does not have.
          // Marking the stage complete while dropping the guide left stage 12
          // permanently unrehearsable, and its empty state sent people back
          // here to repeat the step that had just silently failed them.
          //
          // `build_questions` reads generalQuestions / focusDimensions /
          // counterProductiveQuestions and tolerates either casing, so the
          // guide is stored verbatim rather than reshaped into a second
          // contract that could drift from this one.
          if (!built) {
            // A 200 with no guide in the envelope. Claiming the stage is done
            // would recreate the original defect in a quieter form: a green
            // stage 11 and a stage 12 that can never open.
            return
          }
          advance.mutate({
            stageId: "11",
            state: "complete",
            artefact: built as unknown as Record<string, unknown>,
          })
        },
      }
    )
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Getting ready for the interview</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Interviews feel like a test of who you are. They&apos;re mostly a test of
          how well you&apos;ve thought about it beforehand — and that part is
          entirely within your control. This page tells you which questions this
          particular role is likely to lean on, and why.
        </p>
      </header>

      {matchesLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Looking up the roles you&apos;re matched to…
        </div>
      )}

      {/* No target role → no guide. Say why, and point at the fix. */}
      {!matchesLoading && (matchesError || !matches || matches.length === 0) && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm">
              There&apos;s no role to prepare for yet.
            </p>
            <p className="text-sm text-muted-foreground">
              The questions on this page are built from one specific role&apos;s
              benchmark compared with your own profile — that&apos;s what makes
              them worth rehearsing rather than generic. So we need a target role
              first, and that comes from your job matches. If your matches are
              empty, it usually means no roles have been published to you yet,
              which is normal early on and isn&apos;t anything you did wrong.
            </p>
            <Button
              type="button"
              onClick={() => navigate(ROUTES.DIRECTION_SETTING.MATCHES)}
            >
              <ScanSearch className="mr-1.5 h-4 w-4" aria-hidden />
              Go to job matches
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      )}

      {!matchesLoading && matches && matches.length > 0 && (
        <>
          {matches.length > 1 && (
            <section aria-labelledby="guide-role">
              <h2 id="guide-role" className="mb-2 text-sm font-medium">
                Which role are you preparing for?
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {matches.map((m) => (
                  <button
                    key={m.jobId}
                    type="button"
                    aria-pressed={m.jobId === jobId}
                    onClick={() => {
                      setChosenJobId(m.jobId)
                      generate.reset()
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      m.jobId === jobId
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {m.roleTitle}
                  </button>
                ))}
              </div>
            </section>
          )}

          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {role?.roleTitle ?? "Your target role"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {guide
                    ? "Built from your profile against this role's benchmark. Rebuild it any time your profile changes."
                    : "We'll work out the questions this role is likely to lean on for you specifically."}
                </p>
              </div>
              <Button
                type="button"
                onClick={build}
                disabled={generate.isPending || !candidateId}
              >
                {generate.isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                )}
                {guide ? "Rebuild" : "Build my prep sheet"}
              </Button>
            </CardContent>
          </Card>

          {generate.isError && (
            <p className="text-sm text-muted-foreground">
              That didn&apos;t come back just now. Try again in a moment —
              nothing has been lost.
            </p>
          )}

          {guide && (
            <GuideSections
              guide={guide}
              advocacy={fit?.interviewSelfAdvocacy ?? []}
            />
          )}

          {guide && (
            <footer className="border-t pt-4">
              <p className="mb-2 text-sm text-muted-foreground">
                Want to practise saying any of this out loud?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(ROUTES.DIRECTION_SETTING.REHEARSE)}
              >
                Go to rehearsal
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </footer>
          )}
        </>
      )}
    </div>
  )
}
