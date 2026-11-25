import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { ROUTES } from "@/constants/routes"
import { FitEmptyState } from "@/components/fit/primitives"
import { withPrism } from "@/lib/withPrism"

export type NoPrismSurface = "matches" | "growthAreas" | "detail" | "coach"

/** Literal keys, so the jobFitPages i18n guard sees every one. */
function message(t: TFunction, surface: NoPrismSurface): string {
  switch (surface) {
    case "matches":
      return t(
        "noPrismState.matches",
        "Your matches appear once your PRISM is on file. Add or complete your PRISM to see how you fit the jobs published to you.",
      )
    case "growthAreas":
      return t(
        "noPrismState.growthAreas",
        "Growth areas come from your PRISM. Add or complete your PRISM to see them.",
      )
    case "detail":
      return t("noPrismState.detail", "We need your PRISM to show your fit for this job.")
    case "coach":
      return t(
        "noPrismState.coach",
        "Coaching works from your fit against a job, and your fit needs your PRISM. Add or complete your PRISM to start.",
      )
  }
}

/**
 * NP3 (N1-a / N2-a): the honest state for a person with no PRISM on file.
 *
 * Shown only when the server says so (`emptyReason: "no_prism"` on the matches
 * list, or a 404 coded `no_prism` on a job). It replaces "No published roles are
 * available…", which was false for this person, and gives them the one thing
 * that changes it: a link to PRISM.
 */
export function FitNoPrismState({ surface }: { surface: NoPrismSurface }) {
  const { t } = useTranslation("jobFitPages")
  return (
    <FitEmptyState>
      <p className="mb-3 text-[#6b7280]">{withPrism(message(t, surface))}</p>
      <Link to={ROUTES.PRISM_ASSESSMENT} className="font-medium text-[#0D9488] underline">
        {withPrism(t("noPrismState.link", "Go to PRISM"))}
      </Link>
    </FitEmptyState>
  )
}
