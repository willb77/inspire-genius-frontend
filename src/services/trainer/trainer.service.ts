import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResp = BaseApiResponse<any>

const PREFIX = "/v1/trainer"

// ── Ecosystems ──────────────────────────────────────────────────────
export async function getEcosystems() {
  const { data } = await api.get<ApiResp>(`${PREFIX}/ecosystems`)
  return data
}

export async function testEcosystem(ecosystemId: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/ecosystems/${ecosystemId}/test`)
  return data
}

// ── Agents ──────────────────────────────────────────────────────────
export async function getTrainerAgents(ecosystemId = "inspire-genius") {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents`, { params: { ecosystem_id: ecosystemId } })
  return data
}

export async function getTrainerAgent(agentId: string, ecosystemId = "inspire-genius") {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}`, { params: { ecosystem_id: ecosystemId } })
  return data
}

export async function saveAgentConfig(agentId: string, config: Record<string, unknown>, ecosystemId = "inspire-genius") {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/config`, config, { params: { ecosystem_id: ecosystemId } })
  return data
}

export async function getAgentMaturity(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/maturity`)
  return data
}

export async function getAgentMetrics(agentId: string, periodDays = 30) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/metrics`, { params: { period_days: periodDays } })
  return data
}

// ── Prompts ─────────────────────────────────────────────────────────
export async function getPromptVersions(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/prompts`)
  return data
}

export async function getActivePrompt(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/prompts/active`)
  return data
}

export async function createPrompt(agentId: string, payload: { prompt_text: string; sections?: Record<string, string>; created_by?: string }) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/prompts`, payload)
  return data
}

export async function publishPrompt(agentId: string, version: number) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/prompts/${version}/publish`)
  return data
}

export async function rollbackPrompt(agentId: string, version: number) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/prompts/rollback/${version}`)
  return data
}

export async function diffPrompts(agentId: string, versionA: number, versionB: number) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/prompts/diff`, { params: { version_a: versionA, version_b: versionB } })
  return data
}

export async function startABTest(agentId: string, payload: { variant_a_id: string; variant_b_id: string; traffic_split?: number }) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/prompts/ab-test`, payload)
  return data
}

export async function getABTest(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/prompts/ab-test`)
  return data
}

export async function concludeABTest(agentId: string, winnerId: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/prompts/ab-test/conclude`, { winner_id: winnerId })
  return data
}

// ── Knowledge ───────────────────────────────────────────────────────
export async function getKnowledgeSources(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/knowledge`)
  return data
}

export async function createKnowledgeSource(agentId: string, payload: { name: string; description?: string; source_type?: string }) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/knowledge`, payload)
  return data
}

export async function uploadKnowledgeDoc(agentId: string, sourceId: string, file: File) {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/knowledge/${sourceId}/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } })
  return data
}

export async function deleteKnowledgeDoc(agentId: string, sourceId: string, docId: string) {
  const { data } = await api.delete<ApiResp>(`${PREFIX}/agents/${agentId}/knowledge/${sourceId}/${docId}`)
  return data
}

export async function searchKnowledge(agentId: string, query: string, topK = 5) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/knowledge/search`, { query, top_k: topK })
  return data
}

export async function getKnowledgeCoverage(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/knowledge/coverage`)
  return data
}

// ── Training Plans ──────────────────────────────────────────────────
export async function getTrainingPlans(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/plans`)
  return data
}

export async function createTrainingPlan(agentId: string, payload: { name: string; description?: string; target_accuracy?: number; target_end_date?: string }) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/plans`, payload)
  return data
}

export async function getTrainingPlan(agentId: string, planId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/plans/${planId}`)
  return data
}

export async function addTrainingGoal(agentId: string, planId: string, payload: { title: string; goal_type: string; target_value: number; weight?: number }) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/plans/${planId}/goals`, payload)
  return data
}

export async function evaluateGoal(agentId: string, planId: string, goalId: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/plans/${planId}/goals/${goalId}/evaluate`)
  return data
}

export async function getTrainingProgress(agentId: string, planId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/plans/${planId}/progress`)
  return data
}

export async function activateTrainingPlan(agentId: string, planId: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/plans/${planId}/activate`)
  return data
}

// ── Costs ───────────────────────────────────────────────────────────
export async function getAgentCosts(agentId: string, days = 30) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/costs`, { params: { days } })
  return data
}

export async function getAgentROI(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/costs/roi`)
  return data
}

export async function getCostDashboard(ecosystemId = "inspire-genius") {
  const { data } = await api.get<ApiResp>(`${PREFIX}/costs/dashboard`, { params: { ecosystem_id: ecosystemId } })
  return data
}

export async function getBudgetStatus(ecosystemId = "inspire-genius", agentId?: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/costs/budget`, { params: { ecosystem_id: ecosystemId, agent_id: agentId } })
  return data
}

export async function setBudget(payload: { ecosystem_id: string; agent_id?: string; period: string; limit_usd: number; alert_threshold?: number }) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/costs/budget`, payload)
  return data
}

// ── Evaluation ──────────────────────────────────────────────────────
export async function getEvaluationTests(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/tests`)
  return data
}

export async function createEvaluationTest(agentId: string, payload: { title: string; input_prompt: string; expected_behavior: string; category?: string; priority?: string }) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/tests`, payload)
  return data
}

export async function runAllTests(agentId: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/tests/run`)
  return data
}

export async function getAccuracy(agentId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/agents/${agentId}/accuracy`)
  return data
}

// ── Simulator ───────────────────────────────────────────────────────
export async function simulateMessage(agentId: string, message: string, ecosystemId = "inspire-genius") {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/simulate`, { message, ecosystem_id: ecosystemId })
  return data
}

export async function comparePromptVersions(agentId: string, message: string, versionA: number, versionB: number) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/simulate/compare`, { message, version_a: versionA, version_b: versionB })
  return data
}

export async function generateAdversarial(agentId: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/agents/${agentId}/simulate/adversarial`)
  return data
}

// ── Workflows ───────────────────────────────────────────────────────
export async function getWorkflows() {
  const { data } = await api.get<ApiResp>(`${PREFIX}/workflows`)
  return data
}

export async function createWorkflow(payload: { name: string; dag_config: Record<string, unknown>; trigger_intents?: string[] }) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/workflows`, payload)
  return data
}

export async function getWorkflow(workflowId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/workflows/${workflowId}`)
  return data
}

export async function validateWorkflow(workflowId: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/workflows/${workflowId}/validate`)
  return data
}

// ── Templates ───────────────────────────────────────────────────────
export async function getTemplates(category?: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/templates`, { params: { category } })
  return data
}

export async function getTemplate(templateId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/templates/${templateId}`)
  return data
}

export async function installTemplate(templateId: string, agentConfigId: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/templates/${templateId}/install`, { agent_config_id: agentConfigId })
  return data
}

// ── Audit ───────────────────────────────────────────────────────────
export async function getAuditLog(params?: { agent_id?: string; action?: string; limit?: number; offset?: number }) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/audit`, { params })
  return data
}

export async function getAuditStats() {
  const { data } = await api.get<ApiResp>(`${PREFIX}/audit/stats`)
  return data
}

// ── Executions ──────────────────────────────────────────────────────
export async function startExecution(workflowId: string, triggerInput: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/workflows/${workflowId}/execute`, { trigger_input: triggerInput })
  return data
}

export async function getExecutions(limit = 50, offset = 0) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/executions`, { params: { limit, offset } })
  return data
}

export async function getExecution(executionId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/executions/${executionId}`)
  return data
}

export async function getExecutionSteps(executionId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/executions/${executionId}/steps`)
  return data
}

export async function getExecutionStats() {
  const { data } = await api.get<ApiResp>(`${PREFIX}/executions/stats`)
  return data
}

export async function approveStep(executionId: string, stepId: string, approvedBy: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/executions/${executionId}/steps/${stepId}/approve`, { approved_by: approvedBy })
  return data
}

export async function rejectStep(executionId: string, stepId: string, rejectedBy: string, reason: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/executions/${executionId}/steps/${stepId}/reject`, { rejected_by: rejectedBy, reason })
  return data
}

// ── HITL Approvals ──────────────────────────────────────────────────
export async function getPendingApprovals() {
  const { data } = await api.get<ApiResp>(`${PREFIX}/approvals/pending`)
  return data
}

export async function getApproval(approvalId: string) {
  const { data } = await api.get<ApiResp>(`${PREFIX}/approvals/${approvalId}`)
  return data
}

export async function approveApproval(approvalId: string, approvedBy: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/approvals/${approvalId}/approve`, { approved_by: approvedBy })
  return data
}

export async function rejectApproval(approvalId: string, rejectedBy: string, reason: string) {
  const { data } = await api.post<ApiResp>(`${PREFIX}/approvals/${approvalId}/reject`, { rejected_by: rejectedBy, reason })
  return data
}
