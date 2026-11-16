import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ROUTES } from "@/constants/routes"
import { NoticeCard } from "../DiscoveryParts"
import { costSearch, recallCost } from "./lastCost"

/**
 * House style (career-education): Cost and payback opened with no school.
 *
 * Today this says only "Pick a school first". The house version says why a
 * school is needed and, when this tab has already opened one, offers it back,
 * so reaching Cost from a menu is never a dead end.
 */
export function HouseCostNoQuery() {
  const { t } = useTranslation("careerDiscoveryPages")
  const last = recallCost()
  return (
    <NoticeCard title={t("houseCostTitle", "Choose a school first")}>
      <p>
        {t(
          "houseCostBody",
          'Cost and payback is worked out for one path at one school, because prices and pay differ from school to school. On Education paths, choose a state, then a path, then "Cost and payback" next to a school.'
        )}
      </p>
      <ul className="space-y-1">
        {last ? (
          <li>
            <Link className="underline" to={ROUTES.CAREER_DISCOVERY.COST + costSearch(last)}>
              {t("houseCostLast", "Open the last one you looked at")}
            </Link>
          </li>
        ) : null}
        <li>
          <Link className="underline" to={ROUTES.CAREER_DISCOVERY.EDUCATION}>
            {t("dpGoToEducation", "Go to Education paths")}
          </Link>
        </li>
      </ul>
    </NoticeCard>
  )
}
