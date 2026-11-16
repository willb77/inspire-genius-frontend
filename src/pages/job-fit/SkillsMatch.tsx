import { Link } from "react-router-dom"
import { CheckCircle2, Loader2, Sprout, Wrench } from "lucide-react"
import type { AxiosError } from "axios"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { ROUTES } from "@/constants/routes"
import { useSkillMatch, useSkillMatchEnabled } from "@/hooks/job-fit/useSkillMatch"
import type { SkillMatchItem } from "@/types/job-fit/skillMatch"

/**
 * JF-12 — Skills match: the skills I have and the ones to build for this job.
 *
 * Props contract (the mount is JF-6's, on FitDetailPage — this file does not
 * touch that page):
 *   - `onetSocCode` — the job's O*NET-SOC code (`15-1252.00`) or SOC code
 *     (`15-1252`). JF-3/JF-4 store it on the job; `GET /v1/blueprint/job-dna/{id}`
 *     returns it as `onetSocCode`. The fit detail payload does not carry it.
 *     `null` / `undefined` / `""` means the job has no code yet, and the card
 *     says so rather than rendering blank.
 *
 * Supplementary, never inside the %: the card takes no fit score, reads none
 * and shows none. PRISM fit stays primary.
 *
 * Renders nothing until the server says Skills is on (`job_fit_v2`). Every
 * empty list says why: no skills yet, the job not in O*NET, O*NET not loaded or
 * unreadable. A failed load is an alert, never an empty card.
 */
export interface SkillsMatchProps {
  onetSocCode: string | null | undefined
}

// Kept as exported English constants because the tests compare rendered text with
// them; the page itself renders `t("skillsMatch.noCode" / "skillsMatch.note")`, whose
// English must stay equal to these (the tests fail if it drifts).
export const NO_CODE_TEXT =
  "This job isn't linked to an O*NET occupation yet, so its skills can't be listed."
export const NOTE_TEXT = "Shown beside your fit, not inside it: skills don't change your fit percentage."

function errorText(err: unknown, t: TFunction): string {
  const e = err as AxiosError<{ detail?: unknown }> | undefined
  const detail = e?.response?.data?.detail
  if (typeof detail === "string" && detail) return detail
  if (e?.response?.status === 403) return t("skillsMatch.error403", "Skills aren't available on your account right now.")
  return t("skillsMatch.errorGeneric", "Please try again.")
}

function SkillList({ items, label, tone }: { items: SkillMatchItem[]; label: string; tone: "have" | "build" }) {
  const { t } = useTranslation("jobFitPages")
  return (
    <ul aria-label={label} className="mt-2 flex flex-wrap gap-2">
      {items.map((s) => (
        <li
          key={s.elementId}
          className={
            tone === "have"
              ? "inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-2.5 py-1 text-xs font-medium text-[#0F766E]"
              : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#334155]"
          }
          title={
            s.yourSkill && s.yourSkill !== s.name
              ? t("skillsMatch.savedAs", { defaultValue: "Saved as \"{{skill}}\"", skill: s.yourSkill })
              : undefined
          }
        >
          {tone === "have" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Sprout className="h-3.5 w-3.5" aria-hidden />
          )}
          {s.name}
        </li>
      ))}
    </ul>
  )
}

export function SkillsMatch({ onetSocCode }: SkillsMatchProps) {
  const { t } = useTranslation("jobFitPages")
  const enabled = useSkillMatchEnabled()
  const code = (onetSocCode ?? "").trim()
  const q = useSkillMatch(code, enabled)

  if (!enabled) return null

  const d = q.data
  return (
    <section aria-labelledby="skills-match-heading" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="skills-match-heading" className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
        <Wrench className="h-4 w-4 text-[#0D9488]" aria-hidden />
        {t("skillsMatch.heading", "Skills for this job")}
      </h2>
      <p className="mt-1 text-xs text-[#475569]">
        {t(
          "skillsMatch.note",
          "Shown beside your fit, not inside it: skills don't change your fit percentage.",
        )}
      </p>

      {!code && (
        <p className="mt-3 text-sm text-[#475569]">
          {t(
            "skillsMatch.noCode",
            "This job isn't linked to an O*NET occupation yet, so its skills can't be listed.",
          )}
        </p>
      )}

      {code && q.isLoading && (
        <p className="mt-3 flex items-center gap-2 text-sm text-[#475569]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("skillsMatch.loading", "Loading skills…")}
        </p>
      )}

      {code && q.isError && (
        <p role="alert" className="mt-3 text-sm text-[#B91C1C]">
          {t("skillsMatch.loadError", "Couldn't load the skills for this job.")} {errorText(q.error, t)}
        </p>
      )}

      {code && d && (
        <>
          {d.message && <p className="mt-3 text-sm text-[#475569]">{d.message}</p>}
          {d.reason === "no_skills" && (
            <Link
              className="mt-1 inline-block text-sm font-medium text-[#0D9488] underline-offset-2 hover:underline"
              to={ROUTES.CAREER_DISCOVERY.ABOUT}
            >
              {t("skillsMatch.addSkills", "Add your skills")}
            </Link>
          )}

          {(d.have.length > 0 || d.toBuild.length > 0) && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#0F766E]">
                  {t("skillsMatch.youHave", "You have")}
                </h3>
                {d.have.length > 0 ? (
                  <SkillList items={d.have} label={t("skillsMatch.haveLabel", "Skills you have")} tone="have" />
                ) : (
                  d.reason !== "no_skills" && (
                    <p className="mt-2 text-sm text-[#475569]">
                      {t(
                        "skillsMatch.noneMatch",
                        "None of your saved skills match this job's important O*NET skills yet.",
                      )}
                    </p>
                  )
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#334155]">
                  {t("skillsMatch.toBuild", "To build")}
                </h3>
                {d.toBuild.length > 0 ? (
                  <SkillList items={d.toBuild} label={t("skillsMatch.buildLabel", "Skills to build")} tone="build" />
                ) : (
                  <p className="mt-2 text-sm text-[#475569]">
                    {t("skillsMatch.haveEvery", "You have every skill O*NET rates as important here.")}
                  </p>
                )}
              </div>
            </div>
          )}

          {d.onet?.attribution && (
            <p className="mt-3 text-[11px] text-[#64748B]">
              {d.occupation ? `${d.occupation.title} (${d.occupation.code}). ` : ""}
              {d.onet.attribution}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default SkillsMatch
