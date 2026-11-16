import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { discoveryErrorMessage, useRecordAge } from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"
import { STAGE_ROUTES, stateLabels } from "./stageRoutes"
import { isProfileMerged, shownStage, visibleStages } from "@/lib/career-discovery/profileSection"

const THIS_YEAR = new Date().getFullYear()

// Neutral on purpose: no hint of a "right" answer, no age limit shown before
// the answer. The server keeps only an age range, never the year.
const makeAgeSchema = (t: TFunction) => {
  const msg = t("journeyErrBirthYear", "Enter the year you were born.")
  return z.object({
    birthYear: z.coerce.number({ message: msg }).int(msg).min(1900, msg).max(THIS_YEAR, msg),
  })
}
type AgeSchema = ReturnType<typeof makeAgeSchema>
type AgeForm = z.input<AgeSchema>
type AgeValues = z.output<AgeSchema>

function AgeScreen() {
  const { t } = useTranslation("careerDiscoveryPages")
  const ageSchema = useMemo(() => makeAgeSchema(t), [t])
  const record = useRecordAge()
  const form = useForm<AgeForm, unknown, AgeValues>({
    resolver: zodResolver(ageSchema),
    defaultValues: { birthYear: "" as unknown as number },
  })
  const onSubmit = form.handleSubmit((v) => record.mutate(v.birthYear))
  const fieldError = form.formState.errors.birthYear?.message
  return (
    <div className="space-y-6">
      <StageHeader
        title={t("journeyAgeTitle", "Career & Education Discovery")}
        lead={t(
          "journeyAgeLead",
          "Work out which careers suit how you're wired, what they pay, and the education that gets you there. Start with one question."
        )}
      />
      <Card className="max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("journeyAgeQuestion", "What year were you born?")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <Label htmlFor="cd-birth-year">{t("journeyBirthYearLabel", "Year of birth")}</Label>
            <Input id="cd-birth-year" inputMode="numeric" autoComplete="off" {...form.register("birthYear")} />
            {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
            {record.isError ? <DiscoveryError message={discoveryErrorMessage(record.error)} /> : null}
            <Button type="submit" disabled={record.isPending}>
              {t("journeyContinue", "Continue")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JourneyPage() {
  const { t } = useTranslation("careerDiscoveryPages")
  const { journey } = useDiscoveryContext()
  if (!journey.ageBand) return <AgeScreen />
  // JF-11: with Who I am folded into the profile section, it is not its own
  // entry, and a "next" that points at it points at the section instead.
  const merged = isProfileMerged(journey.stages)
  const next = merged ? shownStage(journey.nextAction, journey.stages) : journey.nextAction
  const stages = merged ? visibleStages(journey.stages) : journey.stages
  return (
    <div className="space-y-6">
      <StageHeader
        title={t("journeyTitle", "Your discovery journey")}
        lead={
          merged
            ? t("journeyLeadNine", "Nine steps from who you are to a plan. Do them in any order and come back any time.")
            : t("journeyLeadTen", "Ten steps from who you are to a plan. Do them in any order and come back any time.")
        }
      />
      {next.id ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("journeyNext", { defaultValue: "Next: {{name}}", name: next.name })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{next.question}</p>
            <Button asChild size="sm">
              <Link to={STAGE_ROUTES[next.id]}>{t("journeyGoTo", { defaultValue: "Go to {{name}}", name: next.name })}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <ol className="grid gap-3 md:grid-cols-2">
        {stages.map((s, i) => (
          <li key={s.id}>
            <Card className={s.available ? "" : "border-dashed opacity-80"}>
              <CardContent className="space-y-1 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link to={STAGE_ROUTES[s.id]} className="font-medium hover:underline">
                    {i + 1}. {s.name}
                  </Link>
                  <Badge variant={s.state === "complete" ? "default" : "outline"}>
                    {s.available ? stateLabels(t)[s.state ?? "not_started"] : t("journeyComingNext", "Coming next")}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{s.question}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  )
}
