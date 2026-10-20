import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type {
  AwaitingValidation,
  BlueprintValidation,
  RationaleReport,
  ValidationRecordBody,
  ValidationRequestBody,
  ValidationStatus,
  ValidationVerdictBody,
} from '@/types/job-blueprint'

/**
 * N-4 — `/v1/blueprint/validation/*` (blueprint-service). Every route answers
 * 403 while the `blueprint_validation` switch is off for the caller; the hooks
 * read that as "hidden", never as an error to show.
 */
const BASE = '/v1/blueprint/validation'

export const validationService = {
  status() {
    return api.get<BaseApiResponse<ValidationStatus>>(`${BASE}/status`)
  },
  awaiting() {
    return api.get<BaseApiResponse<AwaitingValidation[]>>(`${BASE}/awaiting`)
  },
  get(blueprintId: string) {
    return api.get<BaseApiResponse<BlueprintValidation>>(`${BASE}/${blueprintId}`)
  },
  request(blueprintId: string, body: ValidationRequestBody) {
    return api.post<BaseApiResponse<BlueprintValidation>>(`${BASE}/${blueprintId}/request`, body)
  },
  verdict(blueprintId: string, body: ValidationVerdictBody) {
    return api.post<BaseApiResponse<BlueprintValidation>>(`${BASE}/${blueprintId}/verdict`, body)
  },
  record(blueprintId: string, body: ValidationRecordBody) {
    return api.post<BaseApiResponse<BlueprintValidation>>(`${BASE}/${blueprintId}/record`, body)
  },
  withdraw(blueprintId: string, note?: string) {
    return api.post<BaseApiResponse<BlueprintValidation>>(`${BASE}/${blueprintId}/withdraw`, { note })
  },
  rationale(blueprintId: string) {
    return api.get<BaseApiResponse<RationaleReport>>(`${BASE}/${blueprintId}/rationale`)
  },
}
