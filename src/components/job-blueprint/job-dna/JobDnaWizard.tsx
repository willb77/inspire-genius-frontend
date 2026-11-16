import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RoleInfoStep } from './RoleInfoStep'
import { BehaviorRankRate } from './BehaviorRankRate'
import { AptitudeRankRate } from './AptitudeRankRate'
import { CoreTraitRankRate } from './CoreTraitRankRate'
import { RoleContextStep } from './RoleContextStep'
import { ReviewSubmitStep } from './ReviewSubmitStep'
import type { DimensionBenchmark, JobTier } from '@/types/job-blueprint'
import { Check, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type WizardData = {
  roleTitle: string
  department: string
  tier: JobTier
  behaviors: DimensionBenchmark[]
  aptitudes: DimensionBenchmark[]
  coreTraits: DimensionBenchmark[]
  roleContext: {
    workPressures: string[]
    requiredWorkStyles: string[]
    environmentalFactors: string[]
    culturalFactors: string[]
  }
}

type JobDnaWizardProps = {
  onSubmit: (data: WizardData) => void
  isSubmitting?: boolean
}

export function JobDnaWizard({ onSubmit, isSubmitting }: JobDnaWizardProps) {
  const { t } = useTranslation("jobBlueprintPages")
  const STEPS = [
    { label: t("wizard.steps.roleInfo.label", { defaultValue: "Role Info" }), description: t("wizard.steps.roleInfo.description", { defaultValue: "Basic role details" }) },
    { label: t("wizard.steps.behaviors.label", { defaultValue: "Behaviors" }), description: t("wizard.steps.behaviors.description", { defaultValue: "Rank & rate 8 behaviors" }) },
    { label: t("wizard.steps.aptitudes.label", { defaultValue: "Aptitudes" }), description: t("wizard.steps.aptitudes.description", { defaultValue: "Rank & rate 8 aptitudes" }) },
    { label: t("wizard.steps.coreTraits.label", { defaultValue: "Core Traits" }), description: t("wizard.steps.coreTraits.description", { defaultValue: "Rank & rate 6 traits" }) },
    { label: t("wizard.steps.context.label", { defaultValue: "Context" }), description: t("wizard.steps.context.description", { defaultValue: "Work environment" }) },
    { label: t("wizard.steps.review.label", { defaultValue: "Review" }), description: t("wizard.steps.review.description", { defaultValue: "Review & submit" }) },
  ]
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>({
    roleTitle: '',
    department: '',
    tier: 'professional',
    behaviors: [],
    aptitudes: [],
    coreTraits: [],
    roleContext: {
      workPressures: [],
      requiredWorkStyles: [],
      environmentalFactors: [],
      culturalFactors: [],
    },
  })

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return data.roleTitle.trim().length > 0 && data.department.trim().length > 0
      case 1: return data.behaviors.length === 8
      case 2: return data.aptitudes.length === 8
      case 3: return data.coreTraits.length === 6
      case 4: return true // context is optional
      case 5: return true
      default: return false
    }
  }, [step, data])

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleSubmit = () => {
    onSubmit(data)
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav className="flex items-center justify-center" aria-label={t("wizard.stepsLabel", { defaultValue: "Wizard steps" })}>
        <ol className="flex items-center space-x-2">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-center">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  i === step && 'bg-slate-800 text-white',
                  i < step && 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer',
                  i > step && 'bg-slate-100 text-slate-400 cursor-default'
                )}
                disabled={i > step}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  i === step && 'bg-white text-slate-800',
                  i < step && 'bg-green-500 text-white',
                  i > step && 'bg-slate-300 text-white'
                )}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="hidden md:inline font-medium">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn('w-6 h-0.5 mx-1', i < step ? 'bg-green-400' : 'bg-slate-200')} />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 0 && (
          <RoleInfoStep
            value={{ roleTitle: data.roleTitle, department: data.department, tier: data.tier }}
            onChange={v => setData(prev => ({ ...prev, ...v }))}
          />
        )}
        {step === 1 && (
          <BehaviorRankRate
            value={data.behaviors}
            onChange={behaviors => setData(prev => ({ ...prev, behaviors }))}
          />
        )}
        {step === 2 && (
          <AptitudeRankRate
            value={data.aptitudes}
            onChange={aptitudes => setData(prev => ({ ...prev, aptitudes }))}
          />
        )}
        {step === 3 && (
          <CoreTraitRankRate
            value={data.coreTraits}
            onChange={coreTraits => setData(prev => ({ ...prev, coreTraits }))}
          />
        )}
        {step === 4 && (
          <RoleContextStep
            value={data.roleContext}
            onChange={roleContext => setData(prev => ({ ...prev, roleContext }))}
          />
        )}
        {step === 5 && (
          <ReviewSubmitStep
            roleTitle={data.roleTitle}
            department={data.department}
            tier={data.tier}
            behaviors={data.behaviors}
            aptitudes={data.aptitudes}
            coreTraits={data.coreTraits}
            roleContext={data.roleContext}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t("wizard.back", { defaultValue: "Back" })}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            {t("wizard.next", { defaultValue: "Next" })}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Send className="w-4 h-4 mr-1" />
            {isSubmitting ? t("wizard.submitting", { defaultValue: "Submitting..." }) : t("wizard.create", { defaultValue: "Create Job DNA" })}
          </Button>
        )}
      </div>
    </div>
  )
}
