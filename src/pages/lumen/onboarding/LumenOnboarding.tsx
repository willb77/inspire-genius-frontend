import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, Clock, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ROUTES } from "@/constants/routes"
import {
  useOnboardingStatus,
  useRequestPrismSurvey,
} from "@/hooks/lumen/useOnboarding"
import type { OnboardingNextStep } from "@/types/lumen"

/**
 * Lumen consumer onboarding — welcome → PRISM survey → first Self-Portrait.
 *
 * Four states driven by the server's `next_step`, which is derived from the
 * user's PRISM requests and composed portrait rather than a stored flag.
 *
 * **There is no plan chooser and no checkout.** Lumen access is granted, not
 * purchased (build plan §7). If you are looking for where the paywall goes: there
 * isn't one, by decision.
 */

const STEP_COPY: Record<OnboardingNextStep, { title: string; body: string }> = {
  request_prism: {
    title: "Let's start with how you're wired",
    body: "Lumen reads your behavioural profile and turns it into guidance you can use in the moment. That starts with one questionnaire — about 20 minutes, done once.",
  },
  complete_survey: {
    title: "Your questionnaire is ready",
    body: "Finish it whenever suits you. Your profile composes itself as soon as the results come back.",
  },
  awaiting_report: {
    title: "Results are on their way",
    body: "You've finished the questionnaire. We're waiting on the report — this usually takes a short while, and there's nothing for you to do.",
  },
  ready: {
    title: "You're set up",
    body: "Your Self-Portrait has composed. Everything Lumen tells you from here is grounded in it.",
  },
}

function OnboardingSkeleton() {
  return (
    <div className="space-y-4" data-testid="onboarding-loading">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export default function LumenOnboarding() {
  const [forename, setForename] = useState("")
  const [surname, setSurname] = useState("")
  const { data: status, isLoading } = useOnboardingStatus({
    // Poll only while there's something to wait for.
    refetchInterval: (query) =>
      query.state.data?.next_step === "awaiting_report" ? 30_000 : false,
  })
  const { mutate: request, isPending, isError, data: created } = useRequestPrismSurvey()

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <OnboardingSkeleton />
      </div>
    )
  }

  const step: OnboardingNextStep = status?.next_step ?? "request_prism"
  const copy = STEP_COPY[step]
  const surveyUrl = created?.survey_url ?? status?.prism_request?.survey_url ?? null
  const canSubmit = forename.trim().length > 0 && surname.trim().length > 0

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Lumen</h1>
        <p className="max-w-2xl text-muted-foreground">
          Personal behavioural diagnostics, and coaching that shows up when you
          actually need it.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {step === "ready" && (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
            )}
            {step === "awaiting_report" && (
              <Clock className="h-5 w-5 text-muted-foreground" aria-hidden />
            )}
            {copy.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy.body}</p>

          {step === "request_prism" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={forename}
                  onChange={(e) => setForename(e.target.value)}
                  placeholder="First name"
                  aria-label="First name"
                />
                <Input
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Last name"
                  aria-label="Last name"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  disabled={!canSubmit || isPending}
                  onClick={() =>
                    request({ forename: forename.trim(), surname: surname.trim() })
                  }
                >
                  {isPending ? "Requesting…" : "Send me the questionnaire"}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
                {isError && (
                  <span className="text-sm text-destructive">
                    That didn't work. Try again in a moment.
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your name goes to the assessment provider so they can issue the
                questionnaire. Nothing here costs anything.
              </p>
            </div>
          )}

          {surveyUrl && step !== "ready" && (
            <Button asChild variant="outline">
              <a href={surveyUrl} target="_blank" rel="noopener noreferrer">
                Open the questionnaire
                <ExternalLink className="ml-1 h-4 w-4" aria-hidden />
              </a>
            </Button>
          )}

          {step === "ready" && (
            <Button asChild>
              <Link to={ROUTES.LUMEN.SELF_PORTRAIT}>
                See my Self-Portrait
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {status?.instruments && status.instruments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          On file already: {status.instruments.join(", ")}.
        </p>
      )}
    </div>
  )
}
