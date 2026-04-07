import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getTrainerAgents, getTrainerAgent, saveAgentConfig, getAgentMaturity, getAgentMetrics,
  getPromptVersions, getActivePrompt, createPrompt, publishPrompt, rollbackPrompt,
  startABTest, getABTest,
  getKnowledgeSources, createKnowledgeSource, uploadKnowledgeDoc, searchKnowledge, getKnowledgeCoverage,
  getTrainingPlans, createTrainingPlan, getTrainingPlan, addTrainingGoal, evaluateGoal, getTrainingProgress, activateTrainingPlan,
  getAgentCosts, getAgentROI, getCostDashboard, getBudgetStatus, setBudget,
  getEvaluationTests, createEvaluationTest, runAllTests, getAccuracy,
  simulateMessage, comparePromptVersions, generateAdversarial,
  getWorkflows, createWorkflow, getWorkflow, validateWorkflow,
  getTemplates, installTemplate,
  getAuditLog, getAuditStats,
  getEcosystems,
  startExecution, getExecutions, getExecution, getExecutionSteps, getExecutionStats, approveStep, rejectStep,
  getPendingApprovals, approveApproval, rejectApproval,
} from "@/services/trainer/trainer.service"

const QK = {
  agents: (eco: string) => ["trainer", "agents", eco] as const,
  agent: (id: string) => ["trainer", "agent", id] as const,
  maturity: (id: string) => ["trainer", "maturity", id] as const,
  metrics: (id: string, days: number) => ["trainer", "metrics", id, days] as const,
  prompts: (id: string) => ["trainer", "prompts", id] as const,
  activePrompt: (id: string) => ["trainer", "activePrompt", id] as const,
  abTest: (id: string) => ["trainer", "abTest", id] as const,
  knowledge: (id: string) => ["trainer", "knowledge", id] as const,
  coverage: (id: string) => ["trainer", "coverage", id] as const,
  plans: (id: string) => ["trainer", "plans", id] as const,
  plan: (id: string, planId: string) => ["trainer", "plan", id, planId] as const,
  progress: (id: string, planId: string) => ["trainer", "progress", id, planId] as const,
  costs: (id: string, days: number) => ["trainer", "costs", id, days] as const,
  roi: (id: string) => ["trainer", "roi", id] as const,
  costDashboard: (eco: string) => ["trainer", "costDashboard", eco] as const,
  budget: (eco: string) => ["trainer", "budget", eco] as const,
  tests: (id: string) => ["trainer", "tests", id] as const,
  accuracy: (id: string) => ["trainer", "accuracy", id] as const,
  workflows: () => ["trainer", "workflows"] as const,
  workflow: (id: string) => ["trainer", "workflow", id] as const,
  templates: (cat?: string) => ["trainer", "templates", cat] as const,
  audit: () => ["trainer", "audit"] as const,
  ecosystems: () => ["trainer", "ecosystems"] as const,
  executions: () => ["trainer", "executions"] as const,
  execution: (id: string) => ["trainer", "execution", id] as const,
  executionStats: () => ["trainer", "executionStats"] as const,
  pendingApprovals: () => ["trainer", "pendingApprovals"] as const,
}

// ── Ecosystems ──────────────────────────────────────────────────────
export function useEcosystems() {
  return useQuery({ queryKey: QK.ecosystems(), queryFn: getEcosystems, staleTime: 5 * 60_000 })
}

// ── Agents ──────────────────────────────────────────────────────────
export function useTrainerAgents(ecosystemId = "inspire-genius") {
  return useQuery({ queryKey: QK.agents(ecosystemId), queryFn: () => getTrainerAgents(ecosystemId), staleTime: 60_000 })
}

export function useTrainerAgent(agentId: string) {
  return useQuery({ queryKey: QK.agent(agentId), queryFn: () => getTrainerAgent(agentId), enabled: !!agentId })
}

export function useAgentMaturity(agentId: string) {
  return useQuery({ queryKey: QK.maturity(agentId), queryFn: () => getAgentMaturity(agentId), enabled: !!agentId })
}

export function useAgentMetrics(agentId: string, periodDays = 30) {
  return useQuery({ queryKey: QK.metrics(agentId, periodDays), queryFn: () => getAgentMetrics(agentId, periodDays), enabled: !!agentId })
}

export function useSaveAgentConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, config }: { agentId: string; config: Record<string, unknown> }) => saveAgentConfig(agentId, config),
    onSuccess: () => { toast.success("Agent config saved"); qc.invalidateQueries({ queryKey: ["trainer"] }) },
    onError: () => toast.error("Failed to save config"),
  })
}

// ── Prompts ─────────────────────────────────────────────────────────
export function usePromptVersions(agentId: string) {
  return useQuery({ queryKey: QK.prompts(agentId), queryFn: () => getPromptVersions(agentId), enabled: !!agentId })
}

export function useActivePrompt(agentId: string) {
  return useQuery({ queryKey: QK.activePrompt(agentId), queryFn: () => getActivePrompt(agentId), enabled: !!agentId })
}

export function useCreatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: { prompt_text: string; sections?: Record<string, string> } }) => createPrompt(agentId, payload),
    onSuccess: () => { toast.success("Prompt created"); qc.invalidateQueries({ queryKey: ["trainer", "prompts"] }) },
    onError: () => toast.error("Failed to create prompt"),
  })
}

export function usePublishPrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, version }: { agentId: string; version: number }) => publishPrompt(agentId, version),
    onSuccess: () => { toast.success("Prompt published"); qc.invalidateQueries({ queryKey: ["trainer"] }) },
    onError: () => toast.error("Failed to publish prompt"),
  })
}

export function useRollbackPrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, version }: { agentId: string; version: number }) => rollbackPrompt(agentId, version),
    onSuccess: () => { toast.success("Prompt rolled back"); qc.invalidateQueries({ queryKey: ["trainer"] }) },
    onError: () => toast.error("Failed to rollback"),
  })
}

export function useABTest(agentId: string) {
  return useQuery({ queryKey: QK.abTest(agentId), queryFn: () => getABTest(agentId), enabled: !!agentId })
}

export function useStartABTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: { variant_a_id: string; variant_b_id: string; traffic_split?: number } }) => startABTest(agentId, payload),
    onSuccess: () => { toast.success("A/B test started"); qc.invalidateQueries({ queryKey: ["trainer"] }) },
    onError: () => toast.error("Failed to start A/B test"),
  })
}

// ── Knowledge ───────────────────────────────────────────────────────
export function useKnowledgeSources(agentId: string) {
  return useQuery({ queryKey: QK.knowledge(agentId), queryFn: () => getKnowledgeSources(agentId), enabled: !!agentId })
}

export function useCreateKnowledgeSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: { name: string; description?: string; source_type?: string } }) => createKnowledgeSource(agentId, payload),
    onSuccess: () => { toast.success("Knowledge source created"); qc.invalidateQueries({ queryKey: ["trainer", "knowledge"] }) },
    onError: () => toast.error("Failed to create source"),
  })
}

export function useUploadKnowledgeDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, sourceId, file }: { agentId: string; sourceId: string; file: File }) => uploadKnowledgeDoc(agentId, sourceId, file),
    onSuccess: () => { toast.success("Document uploaded"); qc.invalidateQueries({ queryKey: ["trainer", "knowledge"] }) },
    onError: () => toast.error("Failed to upload document"),
  })
}

export function useSearchKnowledge() {
  return useMutation({
    mutationFn: ({ agentId, query, topK }: { agentId: string; query: string; topK?: number }) => searchKnowledge(agentId, query, topK),
  })
}

export function useKnowledgeCoverage(agentId: string) {
  return useQuery({ queryKey: QK.coverage(agentId), queryFn: () => getKnowledgeCoverage(agentId), enabled: !!agentId })
}

// ── Training Plans ──────────────────────────────────────────────────
export function useTrainingPlans(agentId: string) {
  return useQuery({ queryKey: QK.plans(agentId), queryFn: () => getTrainingPlans(agentId), enabled: !!agentId })
}

export function useTrainingPlan(agentId: string, planId: string) {
  return useQuery({ queryKey: QK.plan(agentId, planId), queryFn: () => getTrainingPlan(agentId, planId), enabled: !!agentId && !!planId })
}

export function useTrainingProgress(agentId: string, planId: string) {
  return useQuery({ queryKey: QK.progress(agentId, planId), queryFn: () => getTrainingProgress(agentId, planId), enabled: !!agentId && !!planId })
}

export function useCreateTrainingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: { name: string; target_accuracy?: number } }) => createTrainingPlan(agentId, payload),
    onSuccess: () => { toast.success("Training plan created"); qc.invalidateQueries({ queryKey: ["trainer", "plans"] }) },
    onError: () => toast.error("Failed to create plan"),
  })
}

export function useAddTrainingGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, planId, payload }: { agentId: string; planId: string; payload: { title: string; goal_type: string; target_value: number } }) => addTrainingGoal(agentId, planId, payload),
    onSuccess: () => { toast.success("Goal added"); qc.invalidateQueries({ queryKey: ["trainer", "plan"] }) },
    onError: () => toast.error("Failed to add goal"),
  })
}

export function useEvaluateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, planId, goalId }: { agentId: string; planId: string; goalId: string }) => evaluateGoal(agentId, planId, goalId),
    onSuccess: () => { toast.success("Goal evaluated"); qc.invalidateQueries({ queryKey: ["trainer"] }) },
    onError: () => toast.error("Failed to evaluate goal"),
  })
}

export function useActivateTrainingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, planId }: { agentId: string; planId: string }) => activateTrainingPlan(agentId, planId),
    onSuccess: () => { toast.success("Plan activated"); qc.invalidateQueries({ queryKey: ["trainer"] }) },
    onError: () => toast.error("Failed to activate plan"),
  })
}

// ── Costs ───────────────────────────────────────────────────────────
export function useAgentCosts(agentId: string, days = 30) {
  return useQuery({ queryKey: QK.costs(agentId, days), queryFn: () => getAgentCosts(agentId, days), enabled: !!agentId })
}

export function useAgentROI(agentId: string) {
  return useQuery({ queryKey: QK.roi(agentId), queryFn: () => getAgentROI(agentId), enabled: !!agentId })
}

export function useCostDashboard(ecosystemId = "inspire-genius") {
  return useQuery({ queryKey: QK.costDashboard(ecosystemId), queryFn: () => getCostDashboard(ecosystemId) })
}

export function useBudgetStatus(ecosystemId = "inspire-genius") {
  return useQuery({ queryKey: QK.budget(ecosystemId), queryFn: () => getBudgetStatus(ecosystemId) })
}

export function useSetBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: setBudget,
    onSuccess: () => { toast.success("Budget set"); qc.invalidateQueries({ queryKey: ["trainer", "budget"] }) },
    onError: () => toast.error("Failed to set budget"),
  })
}

// ── Evaluation ──────────────────────────────────────────────────────
export function useEvaluationTests(agentId: string) {
  return useQuery({ queryKey: QK.tests(agentId), queryFn: () => getEvaluationTests(agentId), enabled: !!agentId })
}

export function useCreateEvaluationTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: { title: string; input_prompt: string; expected_behavior: string } }) => createEvaluationTest(agentId, payload),
    onSuccess: () => { toast.success("Test created"); qc.invalidateQueries({ queryKey: ["trainer", "tests"] }) },
    onError: () => toast.error("Failed to create test"),
  })
}

export function useRunAllTests() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (agentId: string) => runAllTests(agentId),
    onSuccess: () => { toast.success("Tests complete"); qc.invalidateQueries({ queryKey: ["trainer"] }) },
    onError: () => toast.error("Tests failed"),
  })
}

export function useAccuracy(agentId: string) {
  return useQuery({ queryKey: QK.accuracy(agentId), queryFn: () => getAccuracy(agentId), enabled: !!agentId })
}

// ── Simulator ───────────────────────────────────────────────────────
export function useSimulateMessage() {
  return useMutation({
    mutationFn: ({ agentId, message }: { agentId: string; message: string }) => simulateMessage(agentId, message),
  })
}

export function useCompareVersions() {
  return useMutation({
    mutationFn: ({ agentId, message, versionA, versionB }: { agentId: string; message: string; versionA: number; versionB: number }) => comparePromptVersions(agentId, message, versionA, versionB),
  })
}

export function useGenerateAdversarial() {
  return useMutation({ mutationFn: (agentId: string) => generateAdversarial(agentId) })
}

// ── Workflows ───────────────────────────────────────────────────────
export function useWorkflows() {
  return useQuery({ queryKey: QK.workflows(), queryFn: getWorkflows })
}

export function useWorkflow(workflowId: string) {
  return useQuery({ queryKey: QK.workflow(workflowId), queryFn: () => getWorkflow(workflowId), enabled: !!workflowId })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => { toast.success("Workflow created"); qc.invalidateQueries({ queryKey: ["trainer", "workflows"] }) },
    onError: () => toast.error("Failed to create workflow"),
  })
}

export function useValidateWorkflow() {
  return useMutation({ mutationFn: (workflowId: string) => validateWorkflow(workflowId) })
}

// ── Templates ───────────────────────────────────────────────────────
export function useTemplates(category?: string) {
  return useQuery({ queryKey: QK.templates(category), queryFn: () => getTemplates(category) })
}

export function useInstallTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, agentConfigId }: { templateId: string; agentConfigId: string }) => installTemplate(templateId, agentConfigId),
    onSuccess: () => { toast.success("Template installed"); qc.invalidateQueries({ queryKey: ["trainer"] }) },
    onError: () => toast.error("Failed to install template"),
  })
}

// ── Audit ───────────────────────────────────────────────────────────
export function useAuditLog(params?: { agent_id?: string; action?: string; limit?: number }) {
  return useQuery({ queryKey: [...QK.audit(), params], queryFn: () => getAuditLog(params) })
}

export function useAuditStats() {
  return useQuery({ queryKey: [...QK.audit(), "stats"], queryFn: getAuditStats })
}

// ── Executions ─────────────────────────────────────────────────────
export function useExecutions(limit = 50, offset = 0) {
  return useQuery({ queryKey: [...QK.executions(), limit, offset], queryFn: () => getExecutions(limit, offset) })
}

export function useExecution(executionId: string) {
  return useQuery({ queryKey: QK.execution(executionId), queryFn: () => getExecution(executionId), enabled: !!executionId })
}

export function useExecutionSteps(executionId: string) {
  return useQuery({ queryKey: [...QK.execution(executionId), "steps"], queryFn: () => getExecutionSteps(executionId), enabled: !!executionId })
}

export function useExecutionStats() {
  return useQuery({ queryKey: QK.executionStats(), queryFn: getExecutionStats })
}

export function useStartExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workflowId, triggerInput }: { workflowId: string; triggerInput: string }) => startExecution(workflowId, triggerInput),
    onSuccess: () => { toast.success("Execution started"); qc.invalidateQueries({ queryKey: ["trainer", "executions"] }) },
    onError: () => toast.error("Failed to start execution"),
  })
}

export function useApproveStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ executionId, stepId, approvedBy }: { executionId: string; stepId: string; approvedBy: string }) => approveStep(executionId, stepId, approvedBy),
    onSuccess: () => { toast.success("Step approved"); qc.invalidateQueries({ queryKey: ["trainer", "execution"] }) },
    onError: () => toast.error("Failed to approve step"),
  })
}

export function useRejectStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ executionId, stepId, rejectedBy, reason }: { executionId: string; stepId: string; rejectedBy: string; reason: string }) => rejectStep(executionId, stepId, rejectedBy, reason),
    onSuccess: () => { toast.success("Step rejected"); qc.invalidateQueries({ queryKey: ["trainer", "execution"] }) },
    onError: () => toast.error("Failed to reject step"),
  })
}

// ── HITL Approvals ──────────────────────────────────────────────────
export function usePendingApprovals() {
  return useQuery({
    queryKey: QK.pendingApprovals(),
    queryFn: getPendingApprovals,
    refetchInterval: 30_000, // Poll every 30s for new approvals
  })
}

export function useApproveApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ approvalId, approvedBy }: { approvalId: string; approvedBy: string }) => approveApproval(approvalId, approvedBy),
    onSuccess: () => { toast.success("Approval granted"); qc.invalidateQueries({ queryKey: ["trainer", "pendingApprovals"] }) },
    onError: () => toast.error("Failed to approve"),
  })
}

export function useRejectApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ approvalId, rejectedBy, reason }: { approvalId: string; rejectedBy: string; reason: string }) => rejectApproval(approvalId, rejectedBy, reason),
    onSuccess: () => { toast.success("Approval rejected"); qc.invalidateQueries({ queryKey: ["trainer", "pendingApprovals"] }) },
    onError: () => toast.error("Failed to reject"),
  })
}
