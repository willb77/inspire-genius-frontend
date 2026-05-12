import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import ChartShell from "./ChartShell"
import type { CommonChartProps } from "./types"

export type FunnelStage = {
  name: string
  value: number
}

const DEFAULT_COLORS = ["#3B5BFF", "#2DD4BF", "#ECC94B", "#10B981", "#8B5CF6", "#EF4444"]

type FunnelChartProps = CommonChartProps & {
  data: FunnelStage[] | undefined
  colors?: string[]
  showStageLabels?: boolean
}

export default function FunnelChart({
  data,
  colors = DEFAULT_COLORS,
  showStageLabels = true,
  loading,
  error,
  emptyState,
  title,
  subtitle,
  height = 220,
  className,
}: FunnelChartProps) {
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
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11 }}
            width={90}
          />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {(data ?? []).map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
            {showStageLabels && (
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                style={{ fill: "#111827", fontSize: 11, fontWeight: 600 }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}
