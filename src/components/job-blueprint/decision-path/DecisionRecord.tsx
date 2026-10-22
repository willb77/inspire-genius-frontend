import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  DecisionCaseView,
  DecisionEvent,
  DecisionFitSnapshot,
  DecisionRuleResult,
  RecommendedRoute,
} from "@/types/job-blueprint"
import { ROUTE_LABEL } from "./labels"

/**
 * The decision audit record on one screen, top to bottom: who and when, what
 * was checked against which written rule, what was recommended and why, what
 * was decided, by whom, and why. Every value is the server's stored value; the
 * screen adds labels and nothing else.
 */

const KIND_LABEL: Record<DecisionEvent["kind"], string> = {
  intake: "Intake",
  qualification_check: "Minimum-qualification check",
  recommendation: "Recommendation (advisory)",
  go_forward: "Go-forward call",
  decision: "Decision",
  amendment: "Amendment",
  withdrawn: "Withdrawn",
  exported: "Record read or exported",
}

function when(at: string | null | undefined): string {
  if (!at) return "—"
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString()
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "no answer"
  if (Array.isArray(v)) return v.join(", ")
  if (typeof v === "boolean") return v ? "yes" : "no"
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
      <td className="py-1 pr-2">{show(r.expected)}</td>
      <td className="py-1 pr-2">{show(r.observed)}</td>
      <td className="py-1">{r.onFail === "none" ? "route only" : `${r.onFail} if not met`}</td>
    </tr>
  )
}

export function RuleResults({ rules }: { rules: DecisionRuleResult[] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-[#6b7280]">
        <tr>
          <th className="pr-2" />
          <th className="pr-2">Rule</th>
          <th className="pr-2">Written standard</th>
          <th className="pr-2">Required</th>
          <th className="pr-2">Recorded</th>
          <th>On fail</th>
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
  if (!fit) return null
  return (
    <div className="rounded-md border border-dashed border-[#d1d5db] p-3 text-xs text-[#374151]">
      <p className="font-medium">Strengths profile (for information — not used for the route)</p>
      {fit.available ? (
        <p>
          Fit {fit.fitScore ?? "—"} / 100{fit.tier ? ` · ${fit.tier}` : " · tier withheld (partial profile)"}
          {fit.blueprintVersion ? ` · role version ${fit.blueprintVersion}` : ""}
        </p>
      ) : (
        <p>{fit.reason}</p>
      )}
      {fit.label ? <p className="mt-1 text-[#6b7280]">{fit.label}</p> : null}
    </div>
  )
}

export function Recommendation({ view }: { view: DecisionCaseView }) {
  const s = view.summary
  return (
    <Section title="Recommendation (advisory)">
      <p className="text-lg font-semibold text-[#1f2937]">
        {s.recommendedRoute ? ROUTE_LABEL[s.recommendedRoute] : "No recommendation yet"}
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
  return (
    <li className="border-t border-[#f3f4f6] py-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-[#1f2937]">{KIND_LABEL[e.kind]}</span>
        <span className="text-xs text-[#6b7280]">
          {when(e.at)} · {e.actor}
          {e.ruleSetVersion ? ` · rule set v${e.ruleSetVersion}` : ""}
          {e.engineVersion ? ` · engine ${e.engineVersion}` : ""}
        </span>
      </div>
      {e.kind === "intake" && e.inputs?.answers ? (
        <p className="text-xs text-[#374151]">
          {e.inputs.update ? "Answers updated: " : "Answers: "}
          {Object.entries(e.inputs.answers)
            .map(([k, v]) => `${k} = ${show(v)}`)
            .join("; ")}
        </p>
      ) : null}
      {e.kind === "qualification_check" && e.result?.rules ? (
        <div className="mt-1">
          <p className="text-xs">{e.result.metMinimum ? "Meets the minimum standard." : "Does not yet meet the minimum standard."}</p>
          <RuleResults rules={e.result.rules} />
        </div>
      ) : null}
      {e.kind === "recommendation" && e.recommendedRoute ? (
        <p className="text-xs">Recommended {ROUTE_LABEL[e.recommendedRoute]}.</p>
      ) : null}
      {(e.kind === "decision" || e.kind === "amendment") && e.finalRoute ? (
        <p className="text-xs">
          Final route {ROUTE_LABEL[e.finalRoute]}
          {e.result?.changedFrom ? ` (changed from ${ROUTE_LABEL[e.result.changedFrom as RecommendedRoute] ?? e.result.changedFrom})` : " (confirmed the recommendation)"}
          {e.result?.flags?.includes("intake_person_decided") ? " · decided by the person who did the intake" : ""}
        </p>
      ) : null}
      {e.kind === "go_forward" && e.result?.call ? <p className="text-xs">Call: {e.result.call}</p> : null}
      {e.reason ? <p className="text-xs text-[#374151]">Reason: {e.reason}</p> : null}
      {e.replay ? (
        <p className={cn("text-xs", e.replay.matches && e.replay.ruleSetHashMatches ? "text-green-700" : "text-red-700")}>
          {e.replay.matches && e.replay.ruleSetHashMatches
            ? "Reconstructed: re-running the stored engine over the stored inputs gives this result."
            : `Does not reconstruct. ${e.replay.note ?? ""}`}
        </p>
      ) : null}
    </li>
  )
}

export function DecisionRecord({ view }: { view: DecisionCaseView }) {
  const s = view.summary
  const validation = s.validationSnapshot
  return (
    <div className="space-y-4">
      <Section title="Case">
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[#6b7280]">Candidate</dt>
            <dd>{view.candidate?.name ?? view.candidateName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#6b7280]">Role</dt>
            <dd>
              {view.role.roleTitle ?? "—"} (version {view.role.version})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6b7280]">Opened</dt>
            <dd>
              {when(view.openedAt)}
              {view.openedBy ? ` by ${view.openedBy}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6b7280]">Status</dt>
            <dd>{view.status}</dd>
          </div>
        </dl>
        {validation && validation.state !== "validated" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3 w-3" /> {validation.statement ?? "This role's benchmark is not validated."}
          </p>
        ) : null}
      </Section>

      {view.ruleSet ? (
        <Section title={`Rule set: ${view.ruleSet.name}, version ${view.ruleSet.version} (${view.ruleSet.status})`}>
          <p className="text-xs text-[#6b7280]">
            Activated {when(view.ruleSet.activatedAt)}
            {view.ruleSet.activatedBy ? ` by ${view.ruleSet.activatedBy}` : ""} · decision-makers:{" "}
            {view.ruleSet.decisionMakers.map((d) => d.name).join(", ")} · integrity: {view.ruleSet.integrity.state}
          </p>
        </Section>
      ) : null}

      <Recommendation view={view} />

      <Section title="Decision">
        {s.finalRoute ? (
          <div className="text-sm">
            <p className="text-lg font-semibold">{ROUTE_LABEL[s.finalRoute]}</p>
            <p>
              {s.decidedBy ? `By ${s.decidedBy}` : ""} {s.decidedAt ? `on ${when(s.decidedAt)}` : ""}
              {s.confirmed === true ? " · confirmed the recommendation" : ""}
              {s.changedFrom ? ` · changed from ${ROUTE_LABEL[s.changedFrom as RecommendedRoute] ?? s.changedFrom}` : ""}
            </p>
            {s.decisionReason ? <p>Reason: {s.decisionReason}</p> : null}
            {s.flags?.includes("intake_person_decided") ? (
              <p className="text-xs text-amber-700">The person who did the intake also decided.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280]">No decision recorded yet.</p>
        )}
      </Section>

      {view.events ? (
        <Section title="Every event, in order">
          <ol>
            {view.events.map((e) => (
              <EventItem key={e.id} e={e} />
            ))}
          </ol>
        </Section>
      ) : null}

      {view.limits ? (
        <Section title="Limits">
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
