import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation("jobBlueprintPages")
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">{t("roleContext.title", { defaultValue: "Role Context & Environment" })}</h3>
        <p className="text-sm text-slate-500">
          {t("roleContext.description", { defaultValue: "Describe the work environment and context for this role. Enter one item per line." })}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="workPressures">{t("roleContext.workPressures", { defaultValue: "Work Pressures" })}</Label>
          <Textarea
            id="workPressures"
            placeholder={t("roleContext.workPressuresPlaceholder", { defaultValue: "e.g. Tight deadlines\nHigh client expectations\nMulti-tasking requirements" })}
            value={arrayToText(value.workPressures)}
            onChange={e => onChange({ ...value, workPressures: textToArray(e.target.value) })}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="requiredWorkStyles">{t("roleContext.requiredWorkStyles", { defaultValue: "Required Work Styles" })}</Label>
          <Textarea
            id="requiredWorkStyles"
            placeholder={t("roleContext.requiredWorkStylesPlaceholder", { defaultValue: "e.g. Collaborative team environment\nIndependent decision-making\nFast-paced execution" })}
            value={arrayToText(value.requiredWorkStyles)}
            onChange={e => onChange({ ...value, requiredWorkStyles: textToArray(e.target.value) })}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="environmentalFactors">{t("roleContext.environmentalFactors", { defaultValue: "Environmental Factors" })}</Label>
          <Textarea
            id="environmentalFactors"
            placeholder={t("roleContext.environmentalFactorsPlaceholder", { defaultValue: "e.g. Open-plan office\nRegular travel required\nRemote/hybrid working" })}
            value={arrayToText(value.environmentalFactors)}
            onChange={e => onChange({ ...value, environmentalFactors: textToArray(e.target.value) })}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="culturalFactors">{t("roleContext.culturalFactors", { defaultValue: "Cultural Factors" })}</Label>
          <Textarea
            id="culturalFactors"
            placeholder={t("roleContext.culturalFactorsPlaceholder", { defaultValue: "e.g. Innovation-driven culture\nStrong compliance requirements\nCustomer-first mentality" })}
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
