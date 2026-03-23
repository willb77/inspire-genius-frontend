import type { EQItem } from '@/types/prism/api-types'

type PrismEQChartProps = {
  data: EQItem[]
}

export default function PrismEQChart({ data }: PrismEQChartProps) {
  if (!data.length) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Emotional Intelligence
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
                className="h-2.5 rounded-full bg-teal-500 transition-all"
                style={{ width: `${item.item_score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
