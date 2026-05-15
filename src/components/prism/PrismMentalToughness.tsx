import type { MentalToughnessItem } from '@/types/prism/api-types'

type PrismMentalToughnessProps = {
  data: MentalToughnessItem[]
}

export default function PrismMentalToughness({
  data,
}: PrismMentalToughnessProps) {
  if (!data.length) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Mental Toughness
      </h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.item_id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.item_title}</span>
              <span className="text-muted-foreground">{item.item_score}</span>
            </div>
            <p className="text-xs text-muted-foreground">{item.item_desc}</p>
            <div className="h-2.5 w-full rounded-full bg-muted">
              <div
                className="h-2.5 rounded-full bg-orange-500 transition-all"
                style={{ width: `${item.item_score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
