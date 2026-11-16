import type { TFunction } from "i18next"
import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import type {
  DecisionCaseView,
  DecisionEvent,
  DecisionFitSnapshot,
  DecisionRuleResult,
  RecommendedRoute,
} from "@/types/job-blueprint"
import { routeLabel } from "./labels"

/**
 * The decision audit record on one screen, top to bottom: who and when, what
 * was checked against which written rule, what was recommended and why, what
 * was decided, by whom, and why. Every value is the server's stored value; the
 * screen adds labels and nothing else.
 */

function kindLabel(t: TFunction, kind: DecisionEvent["kind"]): string {
  const labels: Record<DecisionEvent["kind"], string> = {
    intake: t("record.kind.intake", { defaultValue: "Intake" }),
    qualification_check: t("record.kind.qualificationCheck", { defaultValue: "Minimum-qualification check" }),
    recommendation: t("record.kind.recommendation", { defaultValue: "Recommendation (advisory)" }),
    go_forward: t("record.kind.goForward", { defaultValue: "Go-forward call" }),
    decision: t("record.kind.decision", { defaultValue: "Decision" }),
    amendment: t("record.kind.amendment", { defaultValue: "Amendment" }),
    withdrawn: t("record.kind.withdrawn", { defaultValue: "Withdrawn" }),
    exported: t("record.kind.exported", { defaultValue: "Record read or exported" }),
  }
  return labels[kind]
}

function when(at: string | null | undefined): string {
  if (!at) return "—"
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString()
}

function show(v: unknown, t: TFunction): string {
  if (v === null || v === undefined || v === "") return t("record.noAnswer", { defaultValue: "no answer" })
  if (Array.isArray(v)) return v.join(", ")
  if (typeof v === "boolean") return v ? t("record.yes", { defaultValue: "yes" }) : t("record.no", { defaultValue: "no" })
  return String(v)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-[#1f2937]">{title}</h2>
      {children}
    </section>
  )
}

function RuleRow({ r }: { r: DecisionRuleResult }) {
  const { t } = useTranslation("jobBlueprintPages")
  const Icon = r.outcome === "pass" ? CheckCircle2 : r.outcome === "fail" ? XCircle : CircleDashed
  return (
    <tr className="border-t border-[#f3f4f6] align-top">
      <td className="py-1 pr-2">
        <Icon
          aria-label={r.outcome}
          className={cn(
            "h-4 w-4",
            r.outcome === "pass" ? "text-green-600" : r.outcome === "fail" ? "text-red-600" : "text-amber-600",
          )}
        />
      </td>
      <td className="py-1 pr-2">{r.label}</td>
      <td className="py-1 pr-2 text-[#6b7280]">{r.sourceRef}</td>
      <td className="py-1 pr-2">{show(r.expected, t)}</td>
      <td className="py-1 pr-2">{show(r.observed, t)}</td>
      <td className="py-1">{r.onFail === "none" ? t("ruleSets.routeOnly", { defaultValue: "route only" }) : t("ruleSets.ifNotMet", { defaultValue: "{{onFail}} if not met", onFail: r.onFail })}</td>
    </tr>
  )
}

export function RuleResults({ rules }: { rules: DecisionRuleResult[] }) {
  const { t } = useTranslation("jobBlueprintPages")
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-[#6b7280]">
        <tr>
          <th className="pr-2" />
          <th className="pr-2">{t("record.col.rule", { defaultValue: "Rule" })}</th>
          <th className="pr-2">{t("record.col.standard", { defaultValue: "Written standard" })}</th>
          <th className="pr-2">{t("record.col.required", { defaultValue: "Required" })}</th>
          <th className="pr-2">{t("record.col.recorded", { defaultValue: "Recorded" })}</th>
          <th>{t("record.col.onFail", { defaultValue: "On fail" })}</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((r) => (
          <RuleRow key={r.ruleId} r={r} />
        ))}
      </tbody>
    </table>
  )
}

export function FitSnapshot({ fit }: { fit: DecisionFitSnapshot | null | undefined }) {
  const { t } = useTranslation("jobBlueprintPages")
  if (!fit) return null
  return (
    <div className="rounded-md border border-dashed border-[#d1d5db] p-3 text-xs text-[#374151]">
      <p className="font-medium">{t("record.fit.heading", { defaultValue: "Strengths profile (for information — not used for the route)" })}</p>
      {fit.available ? (
        <p>
          {t("record.fit.line", { defaultValue: "Fit {{score}} / 100", score: fit.fitScore ?? "—" })}
          {fit.tier ? ` · ${fit.tier}` : ` · ${t("record.fit.tierWithheld", { defaultValue: "tier withheld (partial profile)" })}`}
          {fit.blueprintVersion
            ? ` · ${t("record.fit.roleVersion", { defaultValue: "role version {{version}}", version: fit.blueprintVersion })}`
            : ""}
        </p>
      ) : (
        <p>{fit.reason}</p>
      )}
      {fit.label ? <p className="mt-1 text-[#6b7280]">{fit.label}</p> : null}
    </div>
  )
}

export function Recommendation({ view }: { view: DecisionCaseView }) {
  const { t } = useTranslation("jobBlueprintPages")
  const s = view.summary
  return (
    <Section title={t("record.kind.recommendation", { defaultValue: "Recommendation (advisory)" })}>
      <p className="text-lg font-semibold text-[#1f2937]">
        {s.recommendedRoute ? routeLabel(t, s.recommendedRoute) : t("record.noRecommendation", { defaultValue: "No recommendation yet" })}
      </p>
      <ul className="mb-2 list-disc pl-5 text-sm text-[#374151]">
        {s.recommendationReasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mb-2 text-xs text-[#6b7280]">{view.advisoryNote}</p>
      <FitSnapshot fit={s.fitSnapshot} />
    </Section>
  )
}

function EventItem({ e }: { e: DecisionEvent }) {
  const { t } = useTranslation("jobBlueprintPages")
  return (
    <li className="border-t border-[#f3f4f6] py-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-[#1f2937]">{kindLabel(t, e.kind)}</span>
        <span className="text-xs text-[#6b7280]">
          {when(e.at)} · {e.actor}
          {e.ruleSetVersion ? ` · ${t("record.ruleSetVersion", { defaultValue: "rule set v{{version}}", version: e.ruleSetVersion })}` : ""}
          {e.engineVersion ? ` · ${t("record.engineVersion", { defaultValue: "engine {{version}}", version: e.engineVersion })}` : ""}
        </span>
      </div>
      {e.kind === "intake" && e.inputs?.answers ? (
        <p className="text-xs text-[#374151]">
          {e.inputs.update ? t("record.answersUpdated", { defaultValue: "Answers updated:" }) : t("record.answers", { defaultValue: "Answers:" })}{" "}
          {Object.entries(e.inputs.answers)
            .map(([k, v]) => `${k} = ${show(v, t)}`)
            .join("; ")}
        </p>
      ) : null}
      {e.kind === "qualification_check" && e.result?.rules ? (
        <div className="mt-1">
          <p className="text-xs">{e.result.metMinimum ? t("record.meetsMinimum", { defaultValue: "Meets the minimum standard." }) : t("record.notMeetsMinimum", { defaultValue: "Does not yet meet the minimum standard." })}</p>
          <RuleResults rules={e.result.rules} />
        </div>
      ) : null}
      {e.kind === "recommendation" && e.recommendedRoute ? (
        <p className="text-xs">{t("record.recommendedRoute", { defaultValue: "Recommended {{route}}.", route: routeLabel(t, e.recommendedRoute) })}</p>
      ) : null}
      {(e.kind === "decision" || e.kind === "amendment") && e.finalRoute ? (
        <p className="text-xs">
          {t("record.finalRoute", { defaultValue: "Final route {{route}}", route: routeLabel(t, e.finalRoute) })}
          {e.result?.changedFrom
            ? ` (${t("record.changedFrom", { defaultValue: "changed from {{route}}", route: routeLabel(t, e.result.changedFrom as RecommendedRoute) })})`
            : ` (${t("record.confirmedRecommendation", { defaultValue: "confirmed the recommendation" })})`}
          {e.result?.flags?.includes("intake_person_decided")
            ? ` · ${t("record.decidedByIntake", { defaultValue: "decided by the person who did the intake" })}`
            : ""}
        </p>
      ) : null}
      {e.kind === "go_forward" && e.result?.call ? <p className="text-xs">{t("record.call", { defaultValue: "Call: {{call}}", call: e.result.call })}</p> : null}
      {e.reason ? <p className="text-xs text-[#374151]">{t("record.reason", { defaultValue: "Reason: {{reason}}", reason: e.reason })}</p> : null}
      {e.replay ? (
        <p className={cn("text-xs", e.replay.matches && e.replay.ruleSetHashMatches ? "text-green-700" : "text-red-700")}>
          {e.replay.matches && e.replay.ruleSetHashMatches
            ? t("record.reconstructed", { defaultValue: "Reconstructed: re-running the stored engine over the stored inputs gives this result." })
            : t("record.notReconstructed", { defaultValue: "Does not reconstruct. {{note}}", note: e.replay.note ?? "" })}
        </p>
      ) : null}
    </li>
  )
}

export function DecisionRecord({ view }: { view: DecisionCaseView }) {
  const { t } = useTranslation("jobBlueprintPages")
  const s = view.summary
  const validation = s.validationSnapshot
  return (
    <div className="space-y-4">
      <Section title={t("record.case", { defaultValue: "Case" })}>
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[#6b7280]">{t("record.candidate", { defaultValue: "Candidate" })}</dt>
            <dd>{view.candidate?.name ?? view.candidateName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#6b7280]">{t("record.role", { defaultValue: "Role" })}</dt>
            <dd>
              {t("record.roleVersion", { defaultValue: "{{title}} (version {{version}})", title: view.role.roleTitle ?? "—", version: view.role.version })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6b7280]">{t("record.opened", { defaultValue: "Opened" })}</dt>
            <dd>
              {when(view.openedAt)}
              {view.openedBy ? ` ${t("record.by", { defaultValue: "by {{name}}", name: view.openedBy })}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6b7280]">{t("record.status", { defaultValue: "Status" })}</dt>
            <dd>{view.status}</dd>
          </div>
        </dl>
        {validation && validation.state !== "validated" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3 w-3" /> {validation.statement ?? t("record.notValidated", { defaultValue: "This role's benchmark is not validated." })}
          </p>
        ) : null}
      </Section>

      {view.ruleSet ? (
        <Section
          title={t("record.ruleSetTitle", { defaultValue: "Rule set: {{name}}, version {{version}} ({{status}})", name: view.ruleSet.name, version: view.ruleSet.version, status: view.ruleSet.status })}
        >
          <p className="text-xs text-[#6b7280]">
            {t("record.activatedLine", { defaultValue: "Activated {{when}}{{by}} · decision-makers: {{makers}} · integrity: {{integrity}}", when: when(view.ruleSet.activatedAt),
              by: view.ruleSet.activatedBy ? ` ${t("record.by", { defaultValue: "by {{name}}", name: view.ruleSet.activatedBy })}` : "",
              makers: view.ruleSet.decisionMakers.map((d) => d.name).join(", "),
              integrity: view.ruleSet.integrity.state, })}
          </p>
        </Section>
      ) : null}

      <Recommendation view={view} />

      <Section title={t("record.kind.decision", { defaultValue: "Decision" })}>
        {s.finalRoute ? (
          <div className="text-sm">
            <p className="text-lg font-semibold">{routeLabel(t, s.finalRoute)}</p>
            <p>
              {s.decidedBy ? t("record.decidedBy", { defaultValue: "By {{name}}", name: s.decidedBy }) : ""}{" "}
              {s.decidedAt ? t("record.decidedOn", { defaultValue: "on {{when}}", when: when(s.decidedAt) }) : ""}
              {s.confirmed === true ? ` · ${t("record.confirmedRecommendation", { defaultValue: "confirmed the recommendation" })}` : ""}
              {s.changedFrom
                ? ` · ${t("record.changedFrom", { defaultValue: "changed from {{route}}", route: routeLabel(t, s.changedFrom as RecommendedRoute) })}`
                : ""}
            </p>
            {s.decisionReason ? <p>{t("record.reason", { defaultValue: "Reason: {{reason}}", reason: s.decisionReason })}</p> : null}
            {s.flags?.includes("intake_person_decided") ? (
              <p className="text-xs text-amber-700">{t("record.intakeAlsoDecided", { defaultValue: "The person who did the intake also decided." })}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280]">{t("record.noDecision", { defaultValue: "No decision recorded yet." })}</p>
        )}
      </Section>

      {view.events ? (
        <Section title={t("record.events", { defaultValue: "Every event, in order" })}>
          <ol>
            {view.events.map((e) => (
              <EventItem key={e.id} e={e} />
            ))}
          </ol>
        </Section>
      ) : null}

      {view.limits ? (
        <Section title={t("record.limits", { defaultValue: "Limits" })}>
          <ul className="list-disc pl-5 text-xs text-[#6b7280]">
            {view.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}
