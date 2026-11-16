import { Card, CardContent } from '@/components/ui/card'
import type { BlueprintStats } from '@/types/job-blueprint'
import { Briefcase, Users, Clock, TrendingUp, Target, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type StatsGridProps = {
  stats: BlueprintStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  const { t } = useTranslation("jobBlueprintPages")
  const items = [
    { label: t("stats.totalJobDnas", { defaultValue: "Total Job DNAs" }), value: stats.totalJobDnas, icon: Briefcase, color: 'text-blue-600' },
    { label: t("stats.activeJobs", { defaultValue: "Active Jobs" }), value: stats.activeJobs, icon: Target, color: 'text-green-600' },
    { label: t("stats.totalCandidates", { defaultValue: "Total Candidates" }), value: stats.totalCandidates, icon: Users, color: 'text-purple-600' },
    { label: t("stats.avgTimeToFill", { defaultValue: "Avg Time to Fill" }), value: t("stats.daysShort", { defaultValue: "{{n}}d", n: stats.avgTimeToFill }), icon: Clock, color: 'text-orange-600' },
    { label: t("stats.strongFitRate", { defaultValue: "Strong Fit Rate" }), value: `${stats.strongFitRate}%`, icon: TrendingUp, color: 'text-emerald-600' },
    { label: t("stats.hiresThisMonth", { defaultValue: "Hires This Month" }), value: stats.hiresThisMonth, icon: UserCheck, color: 'text-indigo-600' },
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
