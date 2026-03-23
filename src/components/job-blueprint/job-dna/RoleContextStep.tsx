import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type RoleContextData = {
  workPressures: string[]
  requiredWorkStyles: string[]
  environmentalFactors: string[]
  culturalFactors: string[]
}

type RoleContextStepProps = {
  value: RoleContextData
  onChange: (data: RoleContextData) => void
}

function arrayToText(arr: string[]): string {
  return arr.join('\n')
}

function textToArray(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

export function RoleContextStep({ value, onChange }: RoleContextStepProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Role Context & Environment</h3>
        <p className="text-sm text-slate-500">
          Describe the work environment and context for this role. Enter one item per line.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="workPressures">Work Pressures</Label>
          <Textarea
            id="workPressures"
            placeholder="e.g. Tight deadlines&#10;High client expectations&#10;Multi-tasking requirements"
            value={arrayToText(value.workPressures)}
            onChange={e => onChange({ ...value, workPressures: textToArray(e.target.value) })}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="requiredWorkStyles">Required Work Styles</Label>
          <Textarea
            id="requiredWorkStyles"
            placeholder="e.g. Collaborative team environment&#10;Independent decision-making&#10;Fast-paced execution"
            value={arrayToText(value.requiredWorkStyles)}
            onChange={e => onChange({ ...value, requiredWorkStyles: textToArray(e.target.value) })}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="environmentalFactors">Environmental Factors</Label>
          <Textarea
            id="environmentalFactors"
            placeholder="e.g. Open-plan office&#10;Regular travel required&#10;Remote/hybrid working"
            value={arrayToText(value.environmentalFactors)}
            onChange={e => onChange({ ...value, environmentalFactors: textToArray(e.target.value) })}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="culturalFactors">Cultural Factors</Label>
          <Textarea
            id="culturalFactors"
            placeholder="e.g. Innovation-driven culture&#10;Strong compliance requirements&#10;Customer-first mentality"
            value={arrayToText(value.culturalFactors)}
            onChange={e => onChange({ ...value, culturalFactors: textToArray(e.target.value) })}
            rows={4}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}
