import { Link } from "react-router-dom"
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
import { STAGE_ROUTES, STATE_LABELS } from "./stageRoutes"

const THIS_YEAR = new Date().getFullYear()

// Neutral on purpose: no hint of a "right" answer, no age limit shown before
// the answer. The server keeps only an age range, never the year.
const ageSchema = z.object({
  birthYear: z.coerce
    .number({ message: "Enter the year you were born." })
    .int("Enter the year you were born.")
    .min(1900, "Enter the year you were born.")
    .max(THIS_YEAR, "Enter the year you were born."),
})
type AgeForm = z.input<typeof ageSchema>
type AgeValues = z.output<typeof ageSchema>

function AgeScreen() {
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
        title="Career & Education Discovery"
        lead="Work out which careers suit how you're wired, what they pay, and the education that gets you there. Start with one question."
      />
      <Card className="max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What year were you born?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <Label htmlFor="cd-birth-year">Year of birth</Label>
            <Input id="cd-birth-year" inputMode="numeric" autoComplete="off" {...form.register("birthYear")} />
            {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
            {record.isError ? <DiscoveryError message={discoveryErrorMessage(record.error)} /> : null}
            <Button type="submit" disabled={record.isPending}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JourneyPage() {
  const { journey } = useDiscoveryContext()
  if (!journey.ageBand) return <AgeScreen />
  const next = journey.nextAction
  return (
    <div className="space-y-6">
      <StageHeader
        title="Your discovery journey"
        lead="Ten steps from who you are to a plan. Do them in any order and come back any time."
      />
      {next.id ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Next: {next.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{next.question}</p>
            <Button asChild size="sm">
              <Link to={STAGE_ROUTES[next.id]}>Go to {next.name}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <ol className="grid gap-3 md:grid-cols-2">
        {journey.stages.map((s, i) => (
          <li key={s.id}>
            <Card className={s.available ? "" : "border-dashed opacity-80"}>
              <CardContent className="space-y-1 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link to={STAGE_ROUTES[s.id]} className="font-medium hover:underline">
                    {i + 1}. {s.name}
                  </Link>
                  <Badge variant={s.state === "complete" ? "default" : "outline"}>
                    {s.available ? STATE_LABELS[s.state ?? "not_started"] : "Coming next"}
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
