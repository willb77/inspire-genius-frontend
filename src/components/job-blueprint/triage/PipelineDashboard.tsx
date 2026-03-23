import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CandidateCard } from './CandidateCard'
import type { Candidate, PipelineStep } from '@/types/job-blueprint'
import { PIPELINE_STEP_CONFIG } from '@/constants/job-blueprint/classification'
import { LayoutGrid, List, Users } from 'lucide-react'

type PipelineDashboardProps = {
  candidates: Candidate[]
  onCandidateClick?: (candidate: Candidate) => void
  onAdvance?: (candidateId: string) => void
}

const PIPELINE_STEPS: PipelineStep[] = [
  'intake',
  'assessment-invited',
  'assessment-completed',
  'fit-scored',
  'classified',
  'insights-delivered',
  'interview-scheduled',
  'interview-completed',
  'hired',
  'rejected',
]

export function PipelineDashboard({ candidates, onCandidateClick, onAdvance }: PipelineDashboardProps) {
  const [view, setView] = useState<'kanban' | 'table'>('kanban')

  const groupedByStep = PIPELINE_STEPS.reduce<Record<string, Candidate[]>>((acc, step) => {
    acc[step] = candidates.filter(c => c.status === step)
    return acc
  }, {} as Record<string, Candidate[]>)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800">Pipeline</h3>
          <span className="text-sm text-slate-500">({candidates.length} candidates)</span>
        </div>
        <div className="flex gap-1">
          <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>
            <LayoutGrid className="w-4 h-4 mr-1" /> Board
          </Button>
          <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setView('table')}>
            <List className="w-4 h-4 mr-1" /> Table
          </Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STEPS.filter(step => (groupedByStep[step]?.length ?? 0) > 0 || ['intake', 'assessment-invited', 'fit-scored', 'hired'].includes(step)).map(step => {
            const config = PIPELINE_STEP_CONFIG[step]
            const items = groupedByStep[step] ?? []
            return (
              <div key={step} className="min-w-[280px] flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">{config?.label ?? step}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px] bg-slate-50 rounded-lg p-2">
                  {items.map(c => (
                    <CandidateCard key={c.id} candidate={c} onClick={() => onCandidateClick?.(c)} />
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No candidates</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b bg-slate-50">
                    <th className="py-2 px-4">Name</th>
                    <th className="py-2 px-4">Email</th>
                    <th className="py-2 px-4">Status</th>
                    <th className="py-2 px-4">Tier</th>
                    <th className="py-2 px-4">Variation</th>
                    <th className="py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(c => (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                      onClick={() => onCandidateClick?.(c)}
                    >
                      <td className="py-2 px-4 font-medium">{c.name}</td>
                      <td className="py-2 px-4 text-slate-500">{c.email}</td>
                      <td className="py-2 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PIPELINE_STEP_CONFIG[c.status]?.bgClass ?? ''}`}>
                          {PIPELINE_STEP_CONFIG[c.status]?.label ?? c.status}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        {c.classificationTier ?? '--'}
                      </td>
                      <td className="py-2 px-4">{c.variationScores?.totalVariation ?? '--'}</td>
                      <td className="py-2 px-4">
                        {onAdvance && c.status !== 'hired' && c.status !== 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => { e.stopPropagation(); onAdvance(c.id) }}
                          >
                            Advance
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
