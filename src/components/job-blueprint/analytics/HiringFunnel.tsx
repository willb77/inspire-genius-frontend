import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { FunnelStage } from '@/types/job-blueprint'

type HiringFunnelProps = {
  data: FunnelStage[]
}

const COLORS = ['#3182CE', '#2B6CB0', '#2C5282', '#38A169', '#2F855A', '#276749']

export function HiringFunnel({ data }: HiringFunnelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hiring Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={90} />
            <Tooltip formatter={(value: number, _name: string, props: { payload?: FunnelStage }) => [`${value} (${props.payload?.percentage ?? 0}%)`, 'Count']} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
