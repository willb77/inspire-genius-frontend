import { QUADRANT_CONFIG } from '@/constants/prism'
import type { PRISMQuadrant } from '@/types/prism/api-types'

type PrismQuadrantChartProps = {
  quadrants: PRISMQuadrant[]
}

export default function PrismQuadrantChart({
  quadrants,
}: PrismQuadrantChartProps) {
  if (!quadrants.length) return null

  const maxValue = Math.max(...quadrants.map((q) => q.Value), 100)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        PRISM 4D Quadrants
      </h3>
      <div className="space-y-2">
        {quadrants.map((q) => {
          const config =
            QUADRANT_CONFIG[q.QuadID as keyof typeof QUADRANT_CONFIG]
          const pct = (q.Value / maxValue) * 100

          return (
            <div key={q.QuadID} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{config.label}</span>
                <span className="text-muted-foreground">{q.Value}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
