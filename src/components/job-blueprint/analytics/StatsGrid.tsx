import { Card, CardContent } from '@/components/ui/card'
import type { BlueprintStats } from '@/types/job-blueprint'
import { Briefcase, Users, Clock, TrendingUp, Target, UserCheck } from 'lucide-react'

type StatsGridProps = {
  stats: BlueprintStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  const items = [
    { label: 'Total Job DNAs', value: stats.totalJobDnas, icon: Briefcase, color: 'text-blue-600' },
    { label: 'Active Jobs', value: stats.activeJobs, icon: Target, color: 'text-green-600' },
    { label: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'text-purple-600' },
    { label: 'Avg Time to Fill', value: `${stats.avgTimeToFill}d`, icon: Clock, color: 'text-orange-600' },
    { label: 'Strong Fit Rate', value: `${stats.strongFitRate}%`, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Hires This Month', value: stats.hiresThisMonth, icon: UserCheck, color: 'text-indigo-600' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map(item => (
        <Card key={item.label}>
          <CardContent className="py-4 text-center">
            <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
            <p className="text-2xl font-bold text-slate-800">{item.value}</p>
            <p className="text-xs text-slate-500 mt-1">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
