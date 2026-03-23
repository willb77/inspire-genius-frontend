import { BEHAVIOUR_CONFIG } from '@/constants/prism'
import type { PRISMBehaviourDimension } from '@/types/prism/api-types'

type PrismBehaviourChartProps = {
  behaviours: PRISMBehaviourDimension[]
}

export default function PrismBehaviourChart({
  behaviours,
}: PrismBehaviourChartProps) {
  if (!behaviours.length) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        8D Behaviour Dimensions
      </h3>
      <div className="space-y-2">
        {behaviours.map((b) => {
          const config =
            BEHAVIOUR_CONFIG[
              b.BehaviourID as keyof typeof BEHAVIOUR_CONFIG
            ]

          return (
            <div key={b.BehaviourID} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{config.label}</span>
                <span className="text-muted-foreground">{b.Value}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full transition-all"
                  style={{
                    width: `${b.Value}%`,
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
