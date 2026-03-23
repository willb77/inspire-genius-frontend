import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AccuracyDataPoint } from '@/types/job-blueprint'

type AccuracyChartProps = {
  data: AccuracyDataPoint[]
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Prediction Accuracy</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: 0, right: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Legend />
            <Line type="monotone" dataKey="predicted" stroke="#3182CE" strokeWidth={2} name="Predicted Fit %" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="actual" stroke="#38A169" strokeWidth={2} name="Actual Performance %" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
