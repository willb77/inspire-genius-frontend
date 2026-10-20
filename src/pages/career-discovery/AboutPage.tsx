import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROUTES } from "@/constants/routes"
import { SCHOOL_LEVELS } from "@/types/career-discovery"
import { discoveryErrorMessage, useSaveAbout } from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"
import { splitInterests } from "./splitInterests"

const aboutSchema = z.object({
  schoolLevel: z.string().min(1, "Pick where you are now."),
  interests: z.string().max(700, "That's a lot — keep it to about ten things."),
})
type AboutForm = z.infer<typeof aboutSchema>

export default function AboutPage() {
  const { journey } = useDiscoveryContext()
  const save = useSaveAbout()
  const form = useForm<AboutForm>({
    resolver: zodResolver(aboutSchema),
    defaultValues: {
      schoolLevel: journey.schoolLevel ?? "",
      interests: journey.interests.join(", "),
    },
  })
  const onSubmit = form.handleSubmit((v) =>
    save.mutate({ schoolLevel: v.schoolLevel, interests: splitInterests(v.interests) })
  )
  const errors = form.formState.errors
  return (
    <div className="space-y-6">
      <StageHeader title="About me" lead="Where you're starting from. You can change any of this later." />
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="cd-school-level">Where are you now?</Label>
              <select
                id="cd-school-level"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("schoolLevel")}
              >
                <option value="">Choose one</option>
                {SCHOOL_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              {errors.schoolLevel ? <p className="text-sm text-destructive">{errors.schoolLevel.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd-interests">What are you into? (separate with commas)</Label>
              <Input id="cd-interests" placeholder="e.g. drawing, robotics, helping people" {...form.register("interests")} />
              {errors.interests ? <p className="text-sm text-destructive">{errors.interests.message}</p> : null}
            </div>
            {save.isError ? <DiscoveryError message={discoveryErrorMessage(save.error)} /> : null}
            {save.isSuccess ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
            <Button type="submit" disabled={save.isPending}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your PRISM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Career areas are ranked from your PRISM. If you haven&apos;t taken it yet, start here.</p>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.PRISM_ASSESSMENT}>Take or check PRISM</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">A résumé (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>If you have one, add it to your documents. You don&apos;t need one to carry on.</p>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.DOCUMENTS}>Open my documents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
