import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AccuracyReport } from '@/types/job-blueprint'

type AccuracyChartProps = {
  report: AccuracyReport
}

const TIERS = [
  { key: 'strongFit', name: 'Strong fit', color: '#38A169' },
  { key: 'potentialFit', name: 'Potential fit', color: '#3182CE' },
  { key: 'moderateFit', name: 'Moderate fit', color: '#D69E2E' },
  { key: 'misalignment', name: 'Misalignment', color: '#9CA3AF' },
] as const

/**
 * Predicted fit-tier distribution by period. There is no accuracy line to draw:
 * the backend reports counts of PREDICTED tiers and says so in `note`, because
 * no post-hire outcome exists to compare against. The note renders verbatim.
 */
export function AccuracyChart({ report }: AccuracyChartProps) {
  const { distribution, pendingOutcomeData, note } = report
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Predicted fit distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribution} margin={{ left: 0, right: 20 }}>
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              {TIERS.map((t) => (
                <Bar key={t.key} dataKey={t.key} stackId="tier" fill={t.color} name={t.name} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-sm text-[#9ca3af]">No predicted classifications yet.</p>
        )}
        {pendingOutcomeData && (
          <p role="note" className="mt-3 text-xs leading-relaxed text-[#6b7280]">
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
