import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import ChartShell from "./ChartShell"
import type { CommonChartProps } from "./types"

export type GoalsBreakdownDatum = {
  name: string
  value: number
}

const DEFAULT_COLORS = ["#3B5BFF", "#2DD4BF", "#ECC94B", "#10B981", "#8B5CF6", "#EF4444"]

type GoalsBreakdownChartProps = CommonChartProps & {
  data: GoalsBreakdownDatum[] | undefined
  colors?: string[]
  showLabels?: boolean
}

export default function GoalsBreakdownChart({
  data,
  colors = DEFAULT_COLORS,
  showLabels = true,
  loading,
  error,
  emptyState,
  title,
  subtitle,
  height = 220,
  className,
}: GoalsBreakdownChartProps) {
  const isEmpty = !data || data.length === 0
  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      loading={loading}
      error={error}
      emptyState={emptyState}
      isEmpty={isEmpty}
      height={height}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            label={showLabels ? ({ name, value }) => `${name}: ${value}` : undefined}
          >
            {(data ?? []).map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}
