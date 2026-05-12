import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import ChartShell from "./ChartShell"
import type { CommonChartProps } from "./types"

export type CostTrendDatum = Record<string, string | number>

export type CostTrendSeries = {
  key: string
  label?: string
  color?: string
}

type CostTrendChartProps<T extends CostTrendDatum> = CommonChartProps & {
  data: T[] | undefined
  xKey: keyof T & string
  primary: CostTrendSeries
  secondary?: CostTrendSeries
}

export default function CostTrendChart<T extends CostTrendDatum>({
  data,
  xKey,
  primary,
  secondary,
  loading,
  error,
  emptyState,
  title,
  subtitle,
  height = 220,
  className,
}: CostTrendChartProps<T>) {
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
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {secondary && <Legend />}
          <Line
            type="monotone"
            dataKey={primary.key}
            name={primary.label ?? primary.key}
            stroke={primary.color ?? "#3B5BFF"}
            strokeWidth={2}
            dot={false}
          />
          {secondary && (
            <Line
              type="monotone"
              dataKey={secondary.key}
              name={secondary.label ?? secondary.key}
              stroke={secondary.color ?? "#10B981"}
              strokeWidth={2}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}
