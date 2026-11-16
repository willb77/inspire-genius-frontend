import { Link } from "react-router-dom"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
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
import { isProfileMerged, PROFILE_LABEL } from "@/lib/career-discovery/profileSection"
import { SkillsSection } from "./profile/SkillsSection"
import { WhoSection } from "./profile/WhoSection"

const makeAboutSchema = (t: TFunction) =>
  z.object({
    schoolLevel: z.string().min(1, t("aboutErrPickLevel", "Pick where you are now.")),
    interests: z.string().max(700, t("aboutErrInterestsLong", "That's a lot — keep it to about ten things.")),
  })
type AboutForm = z.infer<ReturnType<typeof makeAboutSchema>>

/**
 * About me. JF-11: when the server shows About me and Who I am as one section
 * (`job_fit_v2` applies), this page IS that section — the same About form and
 * the same stored answers, then Who I am and Skills below. Otherwise it renders
 * exactly as before.
 */
export default function AboutPage() {
  const { t } = useTranslation("careerDiscoveryPages")
  const aboutSchema = useMemo(() => makeAboutSchema(t), [t])
  const { journey } = useDiscoveryContext()
  const merged = isProfileMerged(journey.stages)
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
      {merged ? (
        <StageHeader
          title={PROFILE_LABEL}
          lead={t(
            "aboutMergedLead",
            "Where you're starting from, your skills, and how you tend to work. You can change any of this later."
          )}
        />
      ) : (
        <StageHeader
          title={t("aboutTitle", "About me")}
          lead={t("aboutLead", "Where you're starting from. You can change any of this later.")}
        />
      )}
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="cd-school-level">{t("aboutLevelLabel", "Where are you now?")}</Label>
              <select
                id="cd-school-level"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("schoolLevel")}
              >
                <option value="">{t("aboutChooseOne", "Choose one")}</option>
                {SCHOOL_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              {errors.schoolLevel ? <p className="text-sm text-destructive">{errors.schoolLevel.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd-interests">{t("aboutInterestsLabel", "What are you into? (separate with commas)")}</Label>
              <Input id="cd-interests" placeholder={t("aboutInterestsPlaceholder", "e.g. drawing, robotics, helping people")} {...form.register("interests")} />
              {errors.interests ? <p className="text-sm text-destructive">{errors.interests.message}</p> : null}
            </div>
            {save.isError ? <DiscoveryError message={discoveryErrorMessage(save.error)} /> : null}
            {save.isSuccess ? <p className="text-sm text-muted-foreground">{t("aboutSaved", "Saved.")}</p> : null}
            <Button type="submit" disabled={save.isPending}>
              {t("aboutSave", "Save")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("aboutPrismTitle", "Your PRISM")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("aboutPrismBody", "Career areas are ranked from your PRISM. If you haven't taken it yet, start here.")}</p>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.PRISM_ASSESSMENT}>{t("aboutPrismLink", "Take or check PRISM")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("aboutResumeTitle", "A résumé (optional)")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("aboutResumeBody", "If you have one, add it to your documents. You don't need one to carry on.")}</p>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.DOCUMENTS}>{t("aboutResumeLink", "Open my documents")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      {merged ? <SkillsSection /> : null}
      {merged ? <WhoSection embedded /> : null}
    </div>
  )
}
