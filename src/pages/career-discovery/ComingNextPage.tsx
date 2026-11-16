import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { NoticeCard, StageHeader } from "./DiscoveryParts"

const comingNextCopy = (t: TFunction): Record<"education" | "cost", { title: string; lead: string }> => ({
  education: {
    title: t("comingEducationTitle", "Education paths"),
    lead: t("comingEducationLead", "The credentials each career area usually needs, and schools that offer them."),
  },
  cost: {
    title: t("comingCostTitle", "Cost and payback"),
    lead: t("comingCostLead", "What a path costs against what it pays."),
  },
})

/**
 * The two stages not built yet (DISC-2, DISC-3). Honest by construction: this
 * page renders no data at all, so it cannot show an invented number.
 */
export default function ComingNextPage({ stage }: { stage: "education" | "cost" }) {
  const { t } = useTranslation("careerDiscoveryPages")
  const c = comingNextCopy(t)[stage]
  return (
    <div className="space-y-6">
      <StageHeader title={c.title} lead={c.lead} />
      <NoticeCard title={t("comingNextTitle", "Coming next")}>
        <p>
          {t(
            "comingNextBody",
            "This step is being built. When it's ready it will appear here, using what you've already done."
          )}
        </p>
      </NoticeCard>
    </div>
  )
}
