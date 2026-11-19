/**
 * First-run introduction for Bio Capture Studio.
 *
 * Shown once, before the member has any captured story: what this is, how long
 * it takes, who can read it, and ONE obvious first action. Until now the page
 * opened on a chapters grid, a "Suggested next" bar and four starter prompts,
 * all of which started the interview and none of which said why.
 *
 * Purely presentational. The button reuses the chapters strip's steer function,
 * so it opens the suggested chapter exactly as a chapter tile does.
 */
import { ArrowRight, Clock, Lock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { moduleLabel } from "@/lib/bio/clientMemoir"
import { useTranslation } from "react-i18next"

export type BioFirstRunCardProps = {
  /** The chapter Chronicle suggests opening with; falls back to the first. */
  suggestedModule: string | null
  onStart: (moduleType: string) => void
}

const DEFAULT_FIRST_MODULE = "life_story"

export function BioFirstRunCard({ suggestedModule, onStart }: BioFirstRunCardProps) {
  const { t } = useTranslation("studioUi")
  const first = suggestedModule || DEFAULT_FIRST_MODULE
  const points = [
    {
      icon: Clock,
      title: t("user.bioFirstRun.timeTitle", { defaultValue: "A few minutes at a time" }),
      body: t("user.bioFirstRun.timeBody", { defaultValue: "Six chapters, in any order. Stop whenever you like — it saves as you go." }),
    },
    {
      icon: Lock,
      title: t("user.bioFirstRun.privateTitle", { defaultValue: "Private to you" }),
      body: t("user.bioFirstRun.privateBody", { defaultValue: "Only you can read your story." }),
    },
    {
      icon: Users,
      title: t("user.bioFirstRun.coachesTitle", { defaultValue: "Your coaches use it" }),
      body: t("user.bioFirstRun.coachesBody", { defaultValue: "So you don't have to tell the same story twice." }),
    },
  ]
  return (
    <Card data-testid="bio-first-run">
      <CardContent className="space-y-4 py-6 text-center">
        <div>
          <h2 className="text-lg font-semibold">
            {t("user.bioFirstRun.heading", { defaultValue: "Tell your story once. Use it everywhere." })}
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
            {t("user.bioFirstRun.intro", { defaultValue: "A guided conversation with Chronicle, one memory at a time." })}
          </p>
        </div>
        <ul className="grid gap-2 text-left sm:grid-cols-3">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-md bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                {title}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
        <Button onClick={() => onStart(first)} className="gap-1.5">
          {t("user.bioFirstRun.start", { defaultValue: "Start with {{chapter}}", chapter: moduleLabel(first) })}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  )
}

export default BioFirstRunCard
