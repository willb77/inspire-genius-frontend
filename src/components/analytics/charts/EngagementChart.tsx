import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import ChartShell from "./ChartShell"
import type { CommonChartProps } from "./types"

export type EngagementDatum = Record<string, string | number>

type EngagementChartProps<T extends EngagementDatum> = CommonChartProps & {
  data: T[] | undefined
  xKey: keyof T & string
  valueKey: keyof T & string
  color?: string
}

export default function EngagementChart<T extends EngagementDatum>({
  data,
  xKey,
  valueKey,
  color = "#3B5BFF",
  loading,
  error,
  emptyState,
  title,
  subtitle,
  height = 200,
  className,
}: EngagementChartProps<T>) {
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
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={valueKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}
