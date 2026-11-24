import { ClipboardList, Layers, UsersRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ROUTES } from "@/constants/routes"
import { Prism } from "@/components/shared/Prism"

/**
 * The /join brand wall (IN-2c follow-up). Passed to `AuthLayout` as
 * `brandPanel`, which keeps it on screen while the form scrolls.
 *
 * Marketing copy only, in a public repo: no testimonial, no named customer,
 * no promise that someone will contact the registrant (there is no automatic
 * reply in phase 1). Hidden below `lg` with the rest of the wall.
 */

/** The "What happens next" box on /join: it refers to the form's first tick box. */
export const JOIN_NEXT_STEP =
  "No account and nothing to install. Tick the first box to hear when the next webinar is scheduled."
/** The same box on /events, which has no form and so no box to tick. */
export const EVENTS_NEXT_STEP =
  "No account and nothing to install. Register your interest to hear when the next event is announced."

const SETTINGS = [
  ["individuals", "Individuals"],
  ["teams", "Teams"],
  ["organisations", "Organisations"],
  ["education", "Education"],
  ["enterprise", "Enterprise"],
] as const

const iconBox =
  "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg border border-teal-400/35 bg-[#127A8A]/35 text-teal-300"

/**
 * The two points "Built for practitioners." and "Grounded in PRISM." read the same on /join and
 * /events (owner's copy, 2026-11-17: "make the left side of /join match the left side of /events").
 * They are plain English, not i18n keys: the repo's guards need every `t()` key translated in six
 * languages, so they join the translation wave later (until then every language shows English for
 * these two points). The only thing that differs by page is the "What happens next" box, passed as
 * `nextStep`: /join's refers to the form's first tick box, /events has no form.
 *
 * `linkToJoin` (the owner, 2026-11-17: "add a link to the join page under What happens next on the
 * events page") adds a "Register your interest" link to /join directly beneath that box. /events
 * passes it; /join must not (a panel that links to its own page), so it defaults to off. A plain
 * anchor, not a router Link: the page renders with no router.
 */
export function JoinBrandPanel({
  nextStep = JOIN_NEXT_STEP,
  linkToJoin = false,
}: { nextStep?: string; linkToJoin?: boolean } = {}) {
  const { t } = useTranslation("joinPages")
  // The two known copies are translated; any other string a caller passes is shown as given.
  const nextStepText =
    nextStep === JOIN_NEXT_STEP
      ? t("brand.nextStep.join", { defaultValue: "No account and nothing to install. Tick the first box to hear when the next webinar is scheduled." })
      : nextStep === EVENTS_NEXT_STEP
        ? t("brand.nextStep.events", { defaultValue: "No account and nothing to install. Register your interest to hear when the next event is announced." })
        : nextStep
  return (
    <div className="flex max-w-[460px] flex-col gap-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#e7b65a]">{t("brand.eyebrow", { defaultValue: "Register your interest" })}</p>
      <h2 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
        {t("brand.headingLead", { defaultValue: "Support every client" })}{" "}
        <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
          {t("brand.headingAccent", { defaultValue: "between sessions" })}
        </span>
      </h2>
      <p className="text-[14px] leading-relaxed text-white/65">
        {t("brand.intro", { defaultValue: "Inspires Genius gives practitioners an AI mentoring partner that works alongside them, so clients keep making progress even after the session ends." })}
      </p>

      <ul className="flex flex-col gap-3" aria-label={t("brand.offersAria", { defaultValue: "What Inspires Genius offers" })}>
        <li className="flex items-start gap-3">
          <span className={iconBox} aria-hidden="true">
            <UsersRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-white">Built for practitioners.</p>
            <p className="text-[12.5px] leading-snug text-white/60">Follow your clients' progress between sessions, keeping them engaged.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className={iconBox} aria-hidden="true">
            <ClipboardList className="h-4 w-4" />
          </span>
          <p className="text-[12.5px] leading-snug text-white/60">
            <span className="block text-[13.5px] font-semibold text-white">Grounded in <Prism />.</span> Works with the tool your customers understand.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span className={iconBox} aria-hidden="true">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-white">{t("brand.settings.title", { defaultValue: "For every setting" })}</p>
            <p className="text-[12.5px] leading-snug text-white/60">{t("brand.settings.body", { defaultValue: "One platform, many applications." })}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("brand.settings.aria", { defaultValue: "Settings" })}>
              {SETTINGS.map(([key, label]) => (
                <li
                  key={key}
                  className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-0.5 text-xs text-white/85"
                >
                  {t(`brand.settings.${key}`, { defaultValue: label })}
                </li>
              ))}
            </ul>
          </div>
        </li>
      </ul>

      <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#e7b65a]">{t("brand.whatNext", { defaultValue: "What happens next" })}</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-white/70">
          {nextStepText}
        </p>
      </div>
      {linkToJoin && (
        <a
          href={ROUTES.JOIN}
          className="w-fit rounded-sm text-sm font-semibold text-white underline underline-offset-4 hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Register your interest<span aria-hidden="true"> →</span>
        </a>
      )}
    </div>
  )
}

