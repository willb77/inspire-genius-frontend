import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { JobTier } from '@/types/job-blueprint'

type RoleInfoData = {
  roleTitle: string
  department: string
  tier: JobTier
}

type RoleInfoStepProps = {
  value: RoleInfoData
  onChange: (data: RoleInfoData) => void
}

export function RoleInfoStep({ value, onChange }: RoleInfoStepProps) {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Role Information</h3>
        <p className="text-sm text-slate-500">Define the basic details of the role you are benchmarking.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="roleTitle">Role Title</Label>
          <Input
            id="roleTitle"
            placeholder="e.g. Senior Account Manager"
            value={value.roleTitle}
            onChange={e => onChange({ ...value, roleTitle: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            placeholder="e.g. Sales"
            value={value.department}
            onChange={e => onChange({ ...value, department: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Role Tier</Label>
          <Select value={value.tier} onValueChange={(v: JobTier) => onChange({ ...value, tier: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="front-line">Front Line (&lt;$75k)</SelectItem>
              <SelectItem value="professional">Professional ($75k-$150k)</SelectItem>
              <SelectItem value="executive">Executive ($150k+)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            Tier determines pricing for screening, interview guides, and onboarding.
          </p>
        </div>
      </div>
    </div>
  )
}
