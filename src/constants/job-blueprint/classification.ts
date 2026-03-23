// Classification thresholds and interpretation bands

import type { InterpretationBand } from '@/types/job-blueprint'
import type { ClassificationTier } from '@/types/job-blueprint'
import type { ScorecardRecommendation } from '@/types/job-blueprint'

/** Interpretation bands for benchmark scores */
export const INTERPRETATION_BANDS: { min: number; max: number; label: InterpretationBand; display: string; color: string }[] = [
  { min: 85, max: 100, label: 'very-high', display: 'Very High', color: '#38A169' },
  { min: 65, max: 84, label: 'natural', display: 'Natural', color: '#3182CE' },
  { min: 45, max: 64, label: 'moderate', display: 'Moderate', color: '#ECC94B' },
  { min: 25, max: 44, label: 'low', display: 'Low', color: '#DD6B20' },
  { min: 0, max: 24, label: 'avoidance', display: 'Avoidance', color: '#E53E3E' },
]

/** Variation thresholds for candidate classification */
export const VARIATION_THRESHOLDS: { min: number; max: number; tier: ClassificationTier; label: string; color: string }[] = [
  { min: 0, max: 100, tier: 'strong-fit', label: 'Strong Fit', color: '#38A169' },
  { min: 101, max: 200, tier: 'potential-fit', label: 'Potential Fit', color: '#3182CE' },
  { min: 201, max: 300, tier: 'moderate-fit', label: 'Moderate Fit', color: '#ECC94B' },
  { min: 301, max: Infinity, tier: 'misalignment', label: 'Misalignment', color: '#E53E3E' },
]

/** Scorecard grand total interpretation */
export const SCORECARD_THRESHOLDS: { min: number; max: number; recommendation: ScorecardRecommendation; label: string; color: string }[] = [
  { min: 45, max: 55, recommendation: 'strong-hire', label: 'Strong Hire', color: '#38A169' },
  { min: 35, max: 44, recommendation: 'hire-with-plan', label: 'Hire with Development Plan', color: '#3182CE' },
  { min: 25, max: 34, recommendation: 'conditional', label: 'Conditional', color: '#ECC94B' },
  { min: 0, max: 24, recommendation: 'do-not-hire', label: 'Do Not Hire', color: '#E53E3E' },
]

/** Pipeline step display config */
export const PIPELINE_STEP_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  'intake': { label: 'Intake', color: '#6B7280', bgClass: 'bg-gray-100 text-gray-800' },
  'assessment-invited': { label: 'Assessment Invited', color: '#3182CE', bgClass: 'bg-blue-100 text-blue-800' },
  'assessment-completed': { label: 'Assessment Completed', color: '#2B6CB0', bgClass: 'bg-blue-200 text-blue-900' },
  'fit-scored': { label: 'Fit Scored', color: '#DD6B20', bgClass: 'bg-orange-100 text-orange-800' },
  'classified': { label: 'Classified', color: '#805AD5', bgClass: 'bg-purple-100 text-purple-800' },
  'insights-delivered': { label: 'Insights Delivered', color: '#D69E2E', bgClass: 'bg-yellow-100 text-yellow-800' },
  'interview-scheduled': { label: 'Interview Scheduled', color: '#2F855A', bgClass: 'bg-green-100 text-green-800' },
  'interview-completed': { label: 'Interview Completed', color: '#38A169', bgClass: 'bg-green-200 text-green-900' },
  'hired': { label: 'Hired', color: '#276749', bgClass: 'bg-emerald-100 text-emerald-800' },
  'rejected': { label: 'Rejected', color: '#E53E3E', bgClass: 'bg-red-100 text-red-800' },
}

/** Classification tier display config */
export const TIER_CONFIG: Record<ClassificationTier, { label: string; color: string; bgClass: string }> = {
  'strong-fit': { label: 'Strong Fit', color: '#38A169', bgClass: 'bg-green-100 text-green-800' },
  'potential-fit': { label: 'Potential Fit', color: '#3182CE', bgClass: 'bg-blue-100 text-blue-800' },
  'moderate-fit': { label: 'Moderate Fit', color: '#ECC94B', bgClass: 'bg-yellow-100 text-yellow-800' },
  'misalignment': { label: 'Misalignment', color: '#E53E3E', bgClass: 'bg-red-100 text-red-800' },
}
