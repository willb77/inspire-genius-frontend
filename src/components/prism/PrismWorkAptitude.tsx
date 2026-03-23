import type { WorkAptitude } from '@/types/prism/api-types'

type PrismWorkAptitudeProps = {
  data: WorkAptitude[]
}

export default function PrismWorkAptitude({ data }: PrismWorkAptitudeProps) {
  if (!data.length) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Work Aptitude
      </h3>
      <div className="space-y-3">
        {data.map((apt) => (
          <div key={apt.apt_id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{apt.apt_title}</span>
              <span className="text-muted-foreground">{apt.score}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {apt.apt_desc_short}
            </p>
            <div className="flex gap-1">
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${apt.score}%` }}
                />
              </div>
              {apt.occupation_score > 0 && (
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-slate-400 transition-all"
                    style={{ width: `${apt.occupation_score}%` }}
                  />
                </div>
              )}
            </div>
            {apt.occupation_score > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>You: {apt.score}</span>
                <span>Occupation: {apt.occupation_score}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
