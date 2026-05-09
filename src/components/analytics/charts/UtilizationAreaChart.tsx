import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import ChartShell from "./ChartShell"
import type { CommonChartProps } from "./types"

export type UtilizationDatum = Record<string, string | number>

export type UtilizationSeries = {
  key: string
  label?: string
  color?: string
}

type UtilizationAreaChartProps<T extends UtilizationDatum> = CommonChartProps & {
  data: T[] | undefined
  xKey: keyof T & string
  series: UtilizationSeries[]
  stacked?: boolean
}

const DEFAULT_COLORS = ["#3B5BFF", "#2DD4BF", "#ECC94B", "#8B5CF6"]

export default function UtilizationAreaChart<T extends UtilizationDatum>({
  data,
  xKey,
  series,
  stacked = false,
  loading,
  error,
  emptyState,
  title,
  subtitle,
  height = 220,
  className,
}: UtilizationAreaChartProps<T>) {
  const isEmpty = !data || data.length === 0 || series.length === 0
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
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {series.length > 1 && <Legend />}
          {series.map((s, i) => {
            const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label ?? s.key}
                stackId={stacked ? "util" : undefined}
                stroke={color}
                fill={color}
                fillOpacity={0.25}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}
