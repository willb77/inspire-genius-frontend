import type { ReactNode } from "react"
import type { ProfileContent, ProfileSections, Unavailable } from "@/types/careerPathways"

/**
 * N-8 — renders a Career Pathways Profile exactly as stored. The candidate's
 * preview and the recipient's view are the same component, so what the
 * candidate approved is what the recipient reads. A section that is not there
 * was not chosen; a section marked unavailable says why.
 */

const TIER_LABEL: Record<string, string> = {
  "strong-fit": "Strong fit",
  "potential-fit": "Potential fit",
  "moderate-fit": "Moderate fit",
  misalignment: "Misalignment",
}

const BAND_LABEL: Record<string, string> = {
  "strong-alignment": "Strong alignment",
  "good-alignment": "Good alignment",
  "partial-alignment": "Partial alignment",
  "limited-alignment": "Limited alignment",
}

function isUnavailable(s: unknown): s is Unavailable {
  return typeof s === "object" && s !== null && (s as { available?: unknown }).available === false
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#e5e7eb] bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-[#1f2937]">{title}</h3>
      {children}
    </section>
  )
}

function Reason({ s }: { s: Unavailable }) {
  return <p className="text-sm text-[#6b7280]">{s.reason ?? "Not available."}</p>
}

function day(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ""
}

export function ProfileView({ content }: { content: ProfileContent }) {
  const s: ProfileSections = content.sections ?? {}
  return (
    <div className="space-y-3" data-testid="career-profile">
      <div>
        <p className="text-lg font-semibold text-[#1f2937]">{s.identity?.name || "Candidate"}</p>
        {s.identity?.email && <p className="text-sm text-[#6b7280]">{s.identity.email}</p>}
        <p className="mt-1 text-xs text-[#6b7280]">
          A development document the candidate owns. It is not an assessment for any role and must
          not be used to decide hiring or admission.
        </p>
      </div>

      {s.prism && (
        <Section title="PRISM highlights">
          {isUnavailable(s.prism) ? (
            <Reason s={s.prism} />
          ) : (
            <>
              <p className="mb-2 text-xs text-[#6b7280]">{s.prism.note}</p>
              <ul className="mb-3 grid grid-cols-2 gap-2 text-sm">
                {s.prism.colours.map((c) => (
                  <li key={c.colour} className="rounded border border-[#e5e7eb] px-2 py-1">
                    <span className="font-medium">{c.colour}</span> · {c.band}
                    <span className="block text-xs text-[#6b7280]">{c.behaviours.join(" and ")}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1 text-sm">
                {s.prism.behaviours.map((b) => (
                  <li key={b.behaviour}>
                    <span className="font-medium">{b.behaviour}</span> · {b.band}
                    <span className="block text-xs text-[#6b7280]">{b.measures}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      )}

      {s.fit && (
        <Section title="Fit with validated roles">
          {isUnavailable(s.fit) ? (
            <Reason s={s.fit} />
          ) : (
            <>
              {s.fit.roles.length === 0 ? (
                <p className="text-sm text-[#6b7280]" data-testid="fit-empty">
                  {s.fit.note || "No role you can see has a validated benchmark yet."}
                </p>
              ) : (
                <>
                  <ul className="space-y-1 text-sm">
                    {s.fit.roles.map((r) => (
                      <li key={r.jobId}>
                        <span className="font-medium">{r.roleTitle}</span> ·{" "}
                        {r.tier ? (TIER_LABEL[r.tier] ?? r.tier) : "Verdict withheld"}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[#6b7280]">{s.fit.note}</p>
                </>
              )}
            </>
          )}
        </Section>
      )}

      {s.pathway && (
        <Section title="Suggested roles and gaps to close">
          {isUnavailable(s.pathway) ? (
            <Reason s={s.pathway} />
          ) : (
            <>
              <p className="text-sm text-[#6b7280]">{s.pathway.note}</p>
              {s.pathway.suggestions.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {s.pathway.suggestions.map((x, i) => (
                    <li key={x.jobId ?? i}>
                      <span className="font-medium">{x.roleTitle}</span>
                      {x.rationale ? ` — ${x.rationale}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {s.pathway.skillLadders.map((l) => (
                <div key={l.skill} className="mt-2">
                  <p className="text-sm font-medium">Building {l.skill}</p>
                  <ol className="ml-5 list-decimal text-sm text-[#6b7280]">
                    {l.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </>
          )}
        </Section>
      )}

      {s.goals && (
        <Section title="Goals">
          {isUnavailable(s.goals) ? (
            <Reason s={s.goals} />
          ) : s.goals.goals.length === 0 ? (
            <p className="text-sm text-[#6b7280]">No goals were chosen for this profile.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {s.goals.goals.map((g) => (
                <li key={g.goalId}>{g.title}</li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {s.practice && (
        <Section title="Interview practice">
          {isUnavailable(s.practice) ? (
            <Reason s={s.practice} />
          ) : (
            <>
              <p className="text-sm">
                {s.practice.sessions} practice interview{s.practice.sessions === 1 ? "" : "s"}
                {s.practice.sessions > 0 && (
                  <>
                    {" "}· latest {day(s.practice.latestAt)}
                    {s.practice.latestBand ? `, ${BAND_LABEL[s.practice.latestBand] ?? s.practice.latestBand}` : ""}
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-[#6b7280]">{s.practice.note}</p>
            </>
          )}
        </Section>
      )}
    </div>
  )
}
