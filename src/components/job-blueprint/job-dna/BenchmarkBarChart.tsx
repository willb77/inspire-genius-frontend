import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { DimensionBenchmark } from '@/types/job-blueprint'
import { CATEGORY_COLORS } from '@/constants/job-blueprint/dimensions'

type BenchmarkBarChartProps = {
  benchmarks: DimensionBenchmark[]
  title?: string
  height?: number
}

export function BenchmarkBarChart({ benchmarks, title, height = 300 }: BenchmarkBarChartProps) {
  const sorted = [...benchmarks].sort((a, b) => a.rankPosition - b.rankPosition)

  const data = sorted.map(b => ({
    name: b.dimensionName,
    score: b.finalBenchmarkPercent,
    category: b.category,
  }))

  return (
    // min-w-0 lets this chart shrink inside grid/flex columns instead of the
    // parent forcing a width the ResponsiveContainer then measures as 0.
    <div className="w-full min-w-0">
      {title && <h4 className="text-sm font-semibold text-slate-700 mb-3">{title}</h4>}
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        {/* A large left margin PLUS the YAxis width used to exceed a narrow
            grid-column's width, collapsing the plot area to ≤0 so no bars drew.
            The YAxis width alone reserves room for the category labels. */}
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={96} />
          <Tooltip formatter={(value: number) => `${value}%`} />
          <ReferenceLine x={85} stroke="#38A169" strokeDasharray="3 3" label={{ value: 'Very High', fontSize: 9, fill: '#38A169' }} />
          <ReferenceLine x={65} stroke="#3182CE" strokeDasharray="3 3" label={{ value: 'Natural', fontSize: 9, fill: '#3182CE' }} />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={CATEGORY_COLORS[entry.category as keyof typeof CATEGORY_COLORS]?.fill ?? '#6B7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
