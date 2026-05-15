import type { BigFiveItem } from '@/types/prism/api-types'

type PrismBigFiveChartProps = {
  data: BigFiveItem[]
}

export default function PrismBigFiveChart({ data }: PrismBigFiveChartProps) {
  if (!data.length) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Big Five Personality
      </h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.item_id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.item_title}</span>
              <span className="text-muted-foreground">{item.item_score}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted">
              <div
                className="h-2.5 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${item.item_score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
