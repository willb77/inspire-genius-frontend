import { AlertCircle, CheckCircle2 } from "lucide-react"
import type { CurriculumError } from "@/services/curriculum/curriculumErrors"
import type { CurriculumReport } from "@/types/curriculum"
import { formatCycle } from "./curriculumUi"


function where(file: string | null, row: number | null): string {
  if (file && row != null) return `${file} row ${row}: `
  if (file) return `${file}: `
  return ""
}

/**
 * The curriculum validation report — the dry run's answer, and what an import
 * or a publish refuses with. Every section the server sends is rendered; none
 * is summarised away.
 */
export function CurriculumReportView({ report, title }: { report: CurriculumReport; title?: string }) {
  const problems = report.errors.length + report.unknownCodes.length + report.cycles.length
  return (
    <section aria-label={title ?? "Validation report"} className="space-y-3 rounded-lg border p-4 text-sm">
      <div className="flex items-center gap-2">
        {report.ok ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-600" />
        )}
        <p className="font-medium">
          {title ? `${title}: ` : ""}
          {report.ok ? "No problems found" : `${problems} problem${problems === 1 ? "" : "s"} to fix`}
        </p>
      </div>
      <p className="text-muted-foreground">
        {report.counts.courses} courses · {report.counts.programs} programs ·{" "}
        {report.counts.requirementGroups} requirement groups · {report.counts.prerequisiteLinks} prerequisite links
      </p>

      {report.cycles.length > 0 && (
        <div>
          <h4 className="font-medium text-red-700">Requirement loops that can never be satisfied</h4>
          <ul className="list-disc pl-5">
            {report.cycles.map((c) => (
              <li key={c.join("|")}>{formatCycle(c)}</li>
            ))}
          </ul>
        </div>
      )}

      {report.unknownCodes.length > 0 && (
        <div>
          <h4 className="font-medium text-red-700">Course codes not in this catalog</h4>
          <ul className="list-disc pl-5">
            {report.unknownCodes.map((u, i) => (
              <li key={`${u.code}-${i}`}>
                {where(u.file, u.row)}
                {u.code} — needed by {u.referencedBy}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.errors.length > 0 && (
        <div>
          <h4 className="font-medium text-red-700">Errors</h4>
          <ul className="list-disc pl-5">
            {report.errors.map((e, i) => (
              <li key={i}>
                {where(e.file, e.row)}
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.credits.length > 0 && (
        <div>
          <h4 className="font-medium">Credit totals</h4>
          <table className="mt-1 w-full text-left">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pr-3 font-normal">Program</th>
                <th className="pr-3 font-normal">Declared</th>
                <th className="pr-3 font-normal">Required courses</th>
                <th className="pr-3 font-normal">Minimum to complete</th>
                <th className="font-normal">Matches</th>
              </tr>
            </thead>
            <tbody>
              {report.credits.map((c) => (
                <tr key={c.program}>
                  <td className="pr-3">{c.program}</td>
                  <td className="pr-3">{c.declared ?? "—"}</td>
                  <td className="pr-3">{c.requiredCredits}</td>
                  <td className="pr-3">{c.minimumToComplete}</td>
                  <td>{c.matches ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.warnings.length > 0 && (
        <div>
          <h4 className="font-medium text-amber-700">Warnings (reported, not refused)</h4>
          <ul className="list-disc pl-5">
            {report.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** A refused call: the server's message, its list, and its report when it sent one. */
export function CurriculumErrorPanel({ error }: { error: CurriculumError }) {
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <p>{error.message}</p>
      {error.items.length > 0 && (
        <ul className="list-disc pl-5">
          {error.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
      {error.report && <CurriculumReportView report={error.report} title="Server report" />}
    </div>
  )
}
