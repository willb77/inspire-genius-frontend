import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HiresByPeriod } from '@/types/job-blueprint'

type HiresPanelProps = {
  data: HiresByPeriod[]
}

/**
 * Hires by period with the mean predicted fit of those hired
 * (`GET /v1/blueprint/analytics/hires`). A table, not a chart: the series is
 * short and the second column is the point. The caller renders the honest
 * empty state when there are no rows.
 */
export function HiresPanel({ data }: HiresPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hires by period</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1 font-medium">Period</th>
              <th className="py-1 text-right font-medium">Hires</th>
              <th className="py-1 text-right font-medium">Avg predicted fit</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.period} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-800">{row.period}</td>
                <td className="py-1.5 text-right font-semibold text-slate-800">{row.hires}</td>
                <td className="py-1.5 text-right text-slate-600">{Math.round(row.avgFitScore)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
