import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { TimeToFillDataPoint } from '@/types/job-blueprint'

type TimeToFillChartProps = {
  data: TimeToFillDataPoint[]
}

export function TimeToFillChart({ data }: TimeToFillChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Time to Fill (Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ left: 0, right: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => `${value} days`} />
            <Legend />
            <Bar dataKey="days" fill="#3182CE" radius={[4, 4, 0, 0]} name="Days to Fill" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
