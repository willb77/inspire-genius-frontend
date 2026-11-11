import { useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react"
import type { AxiosError } from "axios"
import { useOccupation } from "@/hooks/job-fit/useOccupation"
import { useBlueprintPrograms, useOccupationLocal } from "@/hooks/job-fit/usePathwayCredentials"
import type { LocalKind, LocalRead, PathwayRole } from "@/types/job-fit/pathway"
import { CREDENTIAL_TEXT } from "./_pathway"

/**
 * JF-9 — "Training and credentials" for one pathway job, and where to get
 * them. Closed until the person opens it, so a page of jobs does not fire
 * every lookup up front. Four sources, each of which says why when it has
 * nothing — never a blank block:
 *   - O*NET education (OD-4, `/v1/agents/occupations/{code}`)
 *   - CareerOneStop training, licences, certifications, apprenticeships (OD-5)
 *   - school programmes linked to the job's blueprint (CUR)
 * The occupation code is the job's own (JF-3/JF-4); with none on file the
 * O*NET and CareerOneStop parts say so and make no request.
 */

const KINDS: { kind: LocalKind; label: string }[] = [
  { kind: "training", label: "Training programmes" },
  { kind: "licenses", label: "Licences" },
  { kind: "certifications", label: "Certifications" },
  { kind: "apprenticeships", label: "Apprenticeships" },
]

/** Only http(s) links are drawn as links. */
function safeUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null
}

function Reason({ children, code }: { children: string; code: string }) {
  return (
    <p className="text-sm text-[#6b7280]" data-credential-reason={code}>
      {children}
    </p>
  )
}

function Loading() {
  return (
    <p className="flex items-center gap-2 text-sm text-[#6b7280]">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading…
    </p>
  )
}

function Education({ code }: { code: string | null }) {
  const q = useOccupation(code)
  if (!code) return null
  if (q.isLoading) return <Loading />
  if (q.isError || !q.data) return <Reason code="education-error">{CREDENTIAL_TEXT.educationError}</Reason>
  const rows = (q.data.state === "ready" ? q.data.data?.education : null) ?? []
  const shown = rows.filter((r) => r.label)
  if (shown.length === 0) {
    return <Reason code={`education-${q.data.state}`}>{q.data.reason ?? CREDENTIAL_TEXT.educationNone}</Reason>
  }
  return (
    <ul className="space-y-0.5 text-sm text-[#374151]">
      {shown.map((r) => (
        <li key={r.category}>
          {r.label}
          {r.percent != null && <span className="text-[#6b7280]"> — {Math.round(r.percent)}% of people in this job</span>}
        </li>
      ))}
    </ul>
  )
}

function localReason(read: LocalRead | undefined, failed: boolean): { code: string; text: string } | null {
  if (failed || !read) return { code: "local-unavailable", text: CREDENTIAL_TEXT.localUnavailable }
  if (read.state === "off") return { code: "local-off", text: CREDENTIAL_TEXT.localOff }
  if (read.state === "unavailable") return { code: "local-unavailable", text: CREDENTIAL_TEXT.localUnavailable }
  if (read.state === "empty" || read.data.length === 0) return { code: "local-empty", text: CREDENTIAL_TEXT.localEmpty }
  return null
}

function LocalList({ code, kind, label }: { code: string | null; kind: LocalKind; label: string }) {
  const q = useOccupationLocal(code, kind)
  if (!code) return null
  const why = q.isLoading ? null : localReason(q.data, q.isError)
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}</h5>
      {q.isLoading && <Loading />}
      {why && <Reason code={why.code}>{why.text}</Reason>}
      {!q.isLoading && !why && q.data && (
        <ul className="space-y-1 text-sm text-[#374151]">
          {q.data.data.map((item, i) => {
            const href = safeUrl(item.url)
            const where = [item.organisation, item.location].filter(Boolean).join(" · ")
            return (
              <li key={item.id ?? `${item.title}-${i}`}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0D9488] underline">
                    {item.title}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <span>{item.title}</span>
                )}
                {item.credential && <span className="text-[#6b7280]"> — {item.credential}</span>}
                {where && <span className="block text-xs text-[#9ca3af]">{where}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Programs({ blueprintId }: { blueprintId: string | null }) {
  const q = useBlueprintPrograms(blueprintId)
  if (!blueprintId) return null
  if (q.isLoading) return <Loading />
  if (q.isError) {
    const status = (q.error as AxiosError | null)?.response?.status
    return status === 403 || status === 404 ? (
      <Reason code="programs-hidden">{CREDENTIAL_TEXT.programsHidden}</Reason>
    ) : (
      <Reason code="programs-error">{CREDENTIAL_TEXT.programsError}</Reason>
    )
  }
  const rows = q.data?.programs ?? []
  if (rows.length === 0) return <Reason code="programs-none">{CREDENTIAL_TEXT.programsNone}</Reason>
  return (
    <ul className="space-y-0.5 text-sm text-[#374151]">
      {rows.map((p) => (
        <li key={p.program.id}>
          {p.program.title || p.program.code}
          {p.program.credential && <span className="text-[#6b7280]"> ({p.program.credential})</span>}
          {p.institution.name && <span className="text-[#6b7280]"> — {p.institution.name}</span>}
        </li>
      ))}
    </ul>
  )
}

export function PathwayCredentials({ role }: { role: PathwayRole }) {
  const [open, setOpen] = useState(false)
  const code = open ? (role.onetSocCode ?? role.socCode ?? null) : null
  const hasCode = !!(role.onetSocCode ?? role.socCode)
  const Icon = open ? ChevronDown : ChevronRight
  return (
    <div className="mt-2">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488]"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        Training and credentials
      </button>
      {open && (
        <div className="mt-2 space-y-3 border-l-2 border-[#e5e7eb] pl-3" data-testid="pathway-credentials">
          <div>
            <h4 className="mb-1 text-xs font-semibold text-[#1f2937]">Typical education (O*NET)</h4>
            {hasCode ? <Education code={code} /> : <Reason code="no-code">{CREDENTIAL_TEXT.noCode}</Reason>}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-[#1f2937]">Where to get it near you (CareerOneStop)</h4>
            {hasCode ? (
              <div className="space-y-2">
                {KINDS.map((k) => (
                  <LocalList key={k.kind} code={code} kind={k.kind} label={k.label} />
                ))}
                <p className="text-[11px] text-[#9ca3af]">Source: CareerOneStop, sponsored by the U.S. Department of Labor.</p>
              </div>
            ) : (
              <Reason code="no-code">{CREDENTIAL_TEXT.noCode}</Reason>
            )}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-[#1f2937]">School programmes</h4>
            <Programs blueprintId={open ? role.jobId : null} />
          </div>
        </div>
      )}
    </div>
  )
}
