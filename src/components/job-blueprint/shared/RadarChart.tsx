import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

type RadarDataPoint = {
  dimension: string
  [key: string]: string | number
}

type DatasetConfig = {
  key: string
  name: string
  color: string
  fillOpacity?: number
}

type BlueprintRadarChartProps = {
  data: RadarDataPoint[]
  datasets: DatasetConfig[]
  height?: number
}

export function BlueprintRadarChart({ data, datasets, height = 400 }: BlueprintRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="80%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 10, fill: '#475569' }}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickCount={6}
        />
        {datasets.map(ds => (
          <Radar
            key={ds.key}
            name={ds.name}
            dataKey={ds.key}
            stroke={ds.color}
            fill={ds.color}
            fillOpacity={ds.fillOpacity ?? 0.2}
          />
        ))}
        <Legend />
        <Tooltip />
      </RechartsRadarChart>
    </ResponsiveContainer>
  )
}
