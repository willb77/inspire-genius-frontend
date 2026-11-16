import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { TimeToFillDataPoint } from '@/types/job-blueprint'
import { useTranslation } from 'react-i18next'

type TimeToFillChartProps = {
  data: TimeToFillDataPoint[]
}

export function TimeToFillChart({ data }: TimeToFillChartProps) {
  const { t } = useTranslation("jobBlueprintPages")
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("timeToFill.title", { defaultValue: "Time to Fill (Days)" })}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ left: 0, right: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => t("timeToFill.tooltip", { defaultValue: "{{value}} days", value })} />
            <Legend />
            <Bar dataKey="days" fill="#3182CE" radius={[4, 4, 0, 0]} name={t("timeToFill.series", { defaultValue: "Days to Fill" })} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
