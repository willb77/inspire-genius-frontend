import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type {
  DecisionAnswers,
  DecisionBody,
  DecisionCaseBody,
  DecisionCaseListItem,
  DecisionCaseView,
  DecisionPathStatus,
  DecisionRuleSet,
  DecisionRuleSetBody,
} from '@/types/job-blueprint'

/**
 * Decision path — `/v1/blueprint/decision-path/*` (blueprint-service). Every
 * route answers 403 while the server-side switch is off for the caller; the
 * hooks read that as "hidden", never as an error to show.
 */
const BASE = '/v1/blueprint/decision-path'

export const decisionPathService = {
  status() {
    return api.get<BaseApiResponse<DecisionPathStatus>>(`${BASE}/status`)
  },
  ruleSets() {
    return api.get<BaseApiResponse<DecisionRuleSet[]>>(`${BASE}/rule-sets`)
  },
  createRuleSet(body: DecisionRuleSetBody) {
    return api.post<BaseApiResponse<DecisionRuleSet>>(`${BASE}/rule-sets`, body)
  },
  updateRuleSet(id: string, body: DecisionRuleSetBody) {
    return api.put<BaseApiResponse<DecisionRuleSet>>(`${BASE}/rule-sets/${id}`, body)
  },
  newVersion(id: string) {
    return api.post<BaseApiResponse<DecisionRuleSet>>(`${BASE}/rule-sets/${id}/new-version`)
  },
  activate(id: string) {
    return api.post<BaseApiResponse<DecisionRuleSet>>(`${BASE}/rule-sets/${id}/activate`)
  },
  cases() {
    return api.get<BaseApiResponse<DecisionCaseListItem[]>>(`${BASE}/cases`)
  },
  openCase(body: DecisionCaseBody) {
    return api.post<BaseApiResponse<DecisionCaseView>>(`${BASE}/cases`, body)
  },
  record(id: string) {
    return api.get<BaseApiResponse<DecisionCaseView>>(`${BASE}/cases/${id}/record`)
  },
  recheck(id: string, answers: DecisionAnswers) {
    return api.post<BaseApiResponse<DecisionCaseView>>(`${BASE}/cases/${id}/recheck`, { answers, attest: true })
  },
  decide(id: string, body: DecisionBody) {
    return api.post<BaseApiResponse<DecisionCaseView>>(`${BASE}/cases/${id}/decision`, body)
  },
  amend(id: string, body: DecisionBody) {
    return api.post<BaseApiResponse<DecisionCaseView>>(`${BASE}/cases/${id}/amend`, body)
  },
  withdraw(id: string, reason: string) {
    return api.post<BaseApiResponse<DecisionCaseView>>(`${BASE}/cases/${id}/withdraw`, { reason })
  },
}
