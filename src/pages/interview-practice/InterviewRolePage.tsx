/**
 * /interview-practice/:slug — a public, per-occupation Interview Practice role
 * page (e.g. "Practice your Registered Nurse interview"). Renders the
 * backend-generated content (hero, copy blocks, pay & outlook, FAQs) plus its
 * Schema.org JSON-LD, and funnels into the auth-gated Interview Practice coach.
 */
import { useParams, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowRight, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { useSeo } from "@/hooks/useSeo"
import RolePageShell from "@/components/interview/RolePageShell"
import {
  buildRoleJobDescription,
  getRolePageBySlug,
  type InterviewRolePage as RolePageData,
  type PracticeRoleSeed,
  type RoleOutlook,
  type SalaryRange,
} from "@/types/interviewRolePage"

/** Router state that pre-fills the practice form's role + job description. */
function practiceSeed(page: RolePageData): PracticeRoleSeed {
  return { roleTitle: page.title, jobDescription: buildRoleJobDescription(page) }
}

function money(v: number): string {
  return `$${Math.round(v).toLocaleString("en-US")}`
}

function SalaryCard({ salary }: { salary: SalaryRange }) {
  const { t } = useTranslation("interviewPages")
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">{t("rolePage.typicalPay", "Typical pay (annual)")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">{t("rolePage.entry", "Entry")}</div>
            <div className="text-lg font-semibold">{money(salary.low)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-slate-400">{t("rolePage.median", "Median")}</div>
            <div className="text-2xl font-bold text-indigo-600">{money(salary.median)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-400">{t("rolePage.experienced", "Experienced")}</div>
            <div className="text-lg font-semibold">{money(salary.high)}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">{salary.source} · {salary.asOf}</p>
      </CardContent>
    </Card>
  )
}

function OutlookCard({ outlook }: { outlook: RoleOutlook }) {
  const { t } = useTranslation("interviewPages")
  const Icon = outlook.growthPct > 0 ? TrendingUp : outlook.growthPct < 0 ? TrendingDown : Minus
  const tone = outlook.growthPct > 0 ? "text-emerald-600" : outlook.growthPct < 0 ? "text-rose-600" : "text-slate-500"
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">{t("rolePage.jobOutlook", "Job outlook")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center gap-2 ${tone}`}>
          <Icon className="h-6 w-6" />
          <span className="text-2xl font-bold">{outlook.growthPct > 0 ? "+" : ""}{outlook.growthPct}%</span>
          <span className="text-sm text-slate-500">{t("rolePage.overYears", { defaultValue: "over ~{{years}} years", years: outlook.horizonYears })}</span>
        </div>
        <p className="mt-3 text-xs text-slate-400">{outlook.source} · {outlook.asOf}</p>
      </CardContent>
    </Card>
  )
}

export default function InterviewRolePage() {
  const { t } = useTranslation("interviewPages")
  const { slug } = useParams<{ slug: string }>()
  const page = getRolePageBySlug(slug)

  useSeo({
    title: page ? page.meta.title : t("rolePage.seoFallbackTitle", "Interview Practice | Inspire Genius"),
    description: page?.meta.description,
    canonical: page ? `${window.location.origin}${page.meta.path}` : undefined,
    jsonLd: page ? page.jsonLd : null,
  })

  if (!page) {
    return (
      <RolePageShell>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-semibold">{t("rolePage.notFoundHeading", "We don't have a guide for that role yet")}</h1>
          <p className="mt-2 text-slate-600">{t("rolePage.notFoundBody", "Browse the roles we cover, or jump straight into practice.")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline"><Link to={ROUTES.INTERVIEW_PRACTICE_ROLES}>{t("rolePage.browseGuides", "Browse role guides")}</Link></Button>
            <Button asChild><Link to={ROUTES.INTERVIEW_PRACTICE}>{t("rolePage.startPracticing", "Start practicing")}</Link></Button>
          </div>
        </div>
      </RolePageShell>
    )
  }

  const { salary, outlook } = page.market

  return (
    <RolePageShell>
      <article className="space-y-8">
        <Link to={ROUTES.INTERVIEW_PRACTICE_ROLES} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> {t("rolePage.allGuides", "All role guides")}
        </Link>

        <header>
          <h1 className="text-3xl font-bold tracking-tight">{page.hero.headline}</h1>
          <p className="mt-3 text-lg text-slate-600">{page.hero.subhead}</p>
          <div className="mt-5">
            <Button asChild size="lg">
              <Link to={ROUTES.INTERVIEW_PRACTICE} state={practiceSeed(page)}>
                {t("rolePage.practiceTitle", { defaultValue: "Practice a {{title}} interview", title: page.title })} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        {(salary || outlook) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {salary && <SalaryCard salary={salary} />}
            {outlook && <OutlookCard outlook={outlook} />}
          </div>
        )}

        {page.blocks.map((block) => (
          <section key={block.id} id={block.id}>
            <h2 className="text-xl font-semibold">{block.heading}</h2>
            <p className="mt-2 whitespace-pre-line text-slate-700">{block.body}</p>
          </section>
        ))}

        {page.faqs.length > 0 && (
          <section id="faqs">
            <h2 className="text-xl font-semibold">{t("rolePage.faqHeading", "Frequently asked questions")}</h2>
            <div className="mt-3 space-y-4">
              {page.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-medium text-slate-900">{faq.question}</h3>
                  <p className="mt-1 text-slate-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl bg-slate-50 p-6 text-center">
          <h2 className="text-xl font-semibold">{t("rolePage.readyHeading", "Ready to practice?")}</h2>
          <p className="mt-1 text-slate-600">
            {t("rolePage.readyBody", { defaultValue: "Run a realistic {{title}} interview with your AI coach — free, unlimited, private.", title: page.title })}
          </p>
          <div className="mt-4">
            <Button asChild size="lg">
              <Link to={ROUTES.INTERVIEW_PRACTICE} state={practiceSeed(page)}>
                {t("rolePage.startPracticing", "Start practicing")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </article>
    </RolePageShell>
  )
}
