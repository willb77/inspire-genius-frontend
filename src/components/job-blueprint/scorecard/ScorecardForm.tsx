import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScorecardEntryInput } from './ScorecardEntryInput'
import { ScorecardSummary } from './ScorecardSummary'
import { calculateScorecardTotal } from '@/lib/job-blueprint/scoring'
import type { ScorecardEntry, ScorecardScore } from '@/types/job-blueprint'
import { Send } from 'lucide-react'

type ScorecardSection = {
  title: string
  entries: ScorecardEntry[]
  isCounterProductive?: boolean
}

type ScorecardFormProps = {
  sections: ScorecardSection[]
  onSubmit: (entries: ScorecardEntry[], notes: string) => void
  isSubmitting?: boolean
}

export function ScorecardForm({ sections, onSubmit, isSubmitting }: ScorecardFormProps) {
  const [allEntries, setAllEntries] = useState<ScorecardEntry[]>(
    sections.flatMap(s => s.entries)
  )
  const [notes, setNotes] = useState('')

  const updateEntry = useCallback((dimensionId: number, field: 'score' | 'evidence', value: ScorecardScore | string) => {
    setAllEntries(prev =>
      prev.map(e =>
        e.dimensionId === dimensionId
          ? { ...e, [field]: value }
          : e
      )
    )
  }, [])

  const result = useMemo(() => calculateScorecardTotal(allEntries), [allEntries])

  const handleSubmit = () => {
    onSubmit(allEntries, notes)
  }

  return (
    <div className="space-y-6">
      {sections.map(section => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.entries.map(entry => {
              const current = allEntries.find(e => e.dimensionId === entry.dimensionId)!
              return (
                <ScorecardEntryInput
                  key={entry.dimensionId}
                  dimensionName={entry.dimensionName}
                  score={current.score}
                  evidence={current.evidence}
                  onScoreChange={s => updateEntry(entry.dimensionId, 'score', s)}
                  onEvidenceChange={e => updateEntry(entry.dimensionId, 'evidence', e)}
                  isCounterProductive={section.isCounterProductive}
                />
              )
            })}
          </CardContent>
        </Card>
      ))}

      {/* Running total */}
      <ScorecardSummary grandTotal={result.grandTotal} recommendation={result.recommendation} />

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Overall interview impressions, follow-up actions..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Send className="w-4 h-4 mr-1" />
          {isSubmitting ? 'Submitting...' : 'Submit Scorecard'}
        </Button>
      </div>
    </div>
  )
}
