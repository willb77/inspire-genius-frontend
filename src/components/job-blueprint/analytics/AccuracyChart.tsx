import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AccuracyReport } from '@/types/job-blueprint'
import { useTranslation } from 'react-i18next'

type AccuracyChartProps = {
  report: AccuracyReport
}

const TIER_COLORS = [
  { key: 'strongFit', color: '#38A169' },
  { key: 'potentialFit', color: '#3182CE' },
  { key: 'moderateFit', color: '#D69E2E' },
  { key: 'misalignment', color: '#9CA3AF' },
] as const

/**
 * Predicted fit-tier distribution by period. There is no accuracy line to draw:
 * the backend reports counts of PREDICTED tiers and says so in `note`, because
 * no post-hire outcome exists to compare against. The note renders verbatim.
 */
export function AccuracyChart({ report }: AccuracyChartProps) {
  const { t } = useTranslation("jobBlueprintPages")
  const tierNames: Record<(typeof TIER_COLORS)[number]['key'], string> = {
    strongFit: t("accuracy.strongFit", { defaultValue: "Strong fit" }),
    potentialFit: t("accuracy.potentialFit", { defaultValue: "Potential fit" }),
    moderateFit: t("accuracy.moderateFit", { defaultValue: "Moderate fit" }),
    misalignment: t("accuracy.misalignment", { defaultValue: "Misalignment" }),
  }
  const { distribution, pendingOutcomeData, note } = report
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("accuracy.title", { defaultValue: "Predicted fit distribution" })}</CardTitle>
      </CardHeader>
      <CardContent>
        {distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribution} margin={{ left: 0, right: 20 }}>
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              {TIER_COLORS.map((tier) => (
                <Bar key={tier.key} dataKey={tier.key} stackId="tier" fill={tier.color} name={tierNames[tier.key]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-sm text-[#9ca3af]">{t("accuracy.empty", { defaultValue: "No predicted classifications yet." })}</p>
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
