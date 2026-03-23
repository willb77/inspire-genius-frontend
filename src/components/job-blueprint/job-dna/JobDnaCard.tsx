import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DimensionBadge } from '@/components/job-blueprint/shared/DimensionBadge'
import type { JobDNA } from '@/types/job-blueprint'
import { Briefcase, Calendar } from 'lucide-react'

type JobDnaCardProps = {
  jobDna: JobDNA
  onClick?: () => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  benchmarked: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
}

export function JobDnaCard({ jobDna, onClick }: JobDnaCardProps) {
  const topBehaviors = [...jobDna.behaviors].sort((a, b) => a.rankPosition - b.rankPosition).slice(0, 3)

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{jobDna.roleTitle}</CardTitle>
          <Badge className={statusColors[jobDna.status]}>{jobDna.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5" />
            {jobDna.department}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(jobDna.createdAt).toLocaleDateString()}
          </span>
        </div>
        {topBehaviors.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topBehaviors.map(b => (
              <DimensionBadge key={b.dimensionId} name={b.dimensionName} category="behavior" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
