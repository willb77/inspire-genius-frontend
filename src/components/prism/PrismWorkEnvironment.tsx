import { WORK_ENV_THRESHOLDS } from '@/constants/prism'

type PrismWorkEnvironmentProps = {
  data: Record<string, string>
}

type EnvironmentCategory = 'enhanced' | 'neutral' | 'inhibited'

const CATEGORY_CONFIG: Record<
  EnvironmentCategory,
  { label: string; color: string; bgClass: string }
> = {
  enhanced: {
    label: 'Enhanced',
    color: 'text-green-700',
    bgClass: 'bg-green-50 border-green-200',
  },
  neutral: {
    label: 'Neutral',
    color: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  inhibited: {
    label: 'Inhibited',
    color: 'text-red-700',
    bgClass: 'bg-red-50 border-red-200',
  },
}

function categorize(score: number): EnvironmentCategory {
  if (score >= WORK_ENV_THRESHOLDS.ENHANCED) return 'enhanced'
  if (score >= WORK_ENV_THRESHOLDS.NEUTRAL_LOW) return 'neutral'
  return 'inhibited'
}

export default function PrismWorkEnvironment({
  data,
}: PrismWorkEnvironmentProps) {
  const entries = Object.entries(data)
  if (!entries.length) return null

  const grouped: Record<EnvironmentCategory, { score: number; label: string }[]> = {
    enhanced: [],
    neutral: [],
    inhibited: [],
  }

  for (const [scoreStr, label] of entries) {
    const score = parseInt(scoreStr, 10)
    const cat = categorize(score)
    grouped[cat].push({ score, label })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Work Environment
      </h3>
      {(Object.keys(grouped) as EnvironmentCategory[]).map((cat) => {
        const items = grouped[cat]
        if (!items.length) return null
        const config = CATEGORY_CONFIG[cat]

        return (
          <div key={cat} className="space-y-2">
            <h4 className={`text-sm font-semibold ${config.color}`}>
              {config.label}
            </h4>
            <div className="space-y-1">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm ${config.bgClass}`}
                >
                  <span>{item.label}</span>
                  <span className="font-medium">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
