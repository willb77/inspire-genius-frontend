import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { JobTier } from '@/types/job-blueprint'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation("jobBlueprintPages")
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">{t("roleInfo.title", { defaultValue: "Role Information" })}</h3>
        <p className="text-sm text-slate-500">{t("roleInfo.description", { defaultValue: "Define the basic details of the role you are benchmarking." })}</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="roleTitle">{t("roleInfo.roleTitle", { defaultValue: "Role Title" })}</Label>
          <Input
            id="roleTitle"
            placeholder={t("roleInfo.roleTitlePlaceholder", { defaultValue: "e.g. Senior Account Manager" })}
            value={value.roleTitle}
            onChange={e => onChange({ ...value, roleTitle: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="department">{t("roleInfo.department", { defaultValue: "Department" })}</Label>
          <Input
            id="department"
            placeholder={t("roleInfo.departmentPlaceholder", { defaultValue: "e.g. Sales" })}
            value={value.department}
            onChange={e => onChange({ ...value, department: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label>{t("roleInfo.roleTier", { defaultValue: "Role Tier" })}</Label>
          <Select value={value.tier} onValueChange={(v: JobTier) => onChange({ ...value, tier: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("roleInfo.selectTier", { defaultValue: "Select tier" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="front-line">{t("roleInfo.tier.frontLine", { defaultValue: "Front Line (<$75k)" })}</SelectItem>
              <SelectItem value="professional">{t("roleInfo.tier.professional", { defaultValue: "Professional ($75k-$150k)" })}</SelectItem>
              <SelectItem value="executive">{t("roleInfo.tier.executive", { defaultValue: "Executive ($150k+)" })}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            {t("roleInfo.tierNote", { defaultValue: "Tier determines pricing for screening, interview guides, and onboarding." })}
          </p>
        </div>
      </div>
    </div>
  )
}
