/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  useEcosystems,
  useTrainerAgents,
  useTrainerAgent,
  useSaveAgentConfig,
  usePromptVersions,
  useCreatePrompt,
  useKnowledgeSources,
  useTrainingPlans,
  useWorkflows,
  useTemplates,
  useExecutions,
  usePendingApprovals,
} from "../useTrainer"

jest.mock("@/services/trainer/trainer.service", () => ({
  getEcosystems: jest.fn().mockResolvedValue({ data: [] }),
  getTrainerAgents: jest.fn().mockResolvedValue({ data: [] }),
  getTrainerAgent: jest.fn().mockResolvedValue({ data: { id: "a1" } }),
  saveAgentConfig: jest.fn().mockResolvedValue({ data: {} }),
  getAgentMaturity: jest.fn().mockResolvedValue({ data: {} }),
  getAgentMetrics: jest.fn().mockResolvedValue({ data: {} }),
  getPromptVersions: jest.fn().mockResolvedValue({ data: [] }),
  getActivePrompt: jest.fn().mockResolvedValue({ data: {} }),
  createPrompt: jest.fn().mockResolvedValue({ data: { version: 1 } }),
  publishPrompt: jest.fn().mockResolvedValue({ data: {} }),
  rollbackPrompt: jest.fn().mockResolvedValue({ data: {} }),
  startABTest: jest.fn().mockResolvedValue({ data: {} }),
  getABTest: jest.fn().mockResolvedValue({ data: {} }),
  getKnowledgeSources: jest.fn().mockResolvedValue({ data: [] }),
  createKnowledgeSource: jest.fn().mockResolvedValue({ data: {} }),
  uploadKnowledgeDoc: jest.fn().mockResolvedValue({ data: {} }),
  searchKnowledge: jest.fn().mockResolvedValue({ data: [] }),
  getKnowledgeCoverage: jest.fn().mockResolvedValue({ data: {} }),
  getTrainingPlans: jest.fn().mockResolvedValue({ data: [] }),
  createTrainingPlan: jest.fn().mockResolvedValue({ data: {} }),
  getTrainingPlan: jest.fn().mockResolvedValue({ data: {} }),
  addTrainingGoal: jest.fn().mockResolvedValue({ data: {} }),
  evaluateGoal: jest.fn().mockResolvedValue({ data: {} }),
  getTrainingProgress: jest.fn().mockResolvedValue({ data: {} }),
  activateTrainingPlan: jest.fn().mockResolvedValue({ data: {} }),
  getAgentCosts: jest.fn().mockResolvedValue({ data: {} }),
  getAgentROI: jest.fn().mockResolvedValue({ data: {} }),
  getCostDashboard: jest.fn().mockResolvedValue({ data: {} }),
  getBudgetStatus: jest.fn().mockResolvedValue({ data: {} }),
  setBudget: jest.fn().mockResolvedValue({ data: {} }),
  getEvaluationTests: jest.fn().mockResolvedValue({ data: [] }),
  createEvaluationTest: jest.fn().mockResolvedValue({ data: {} }),
  runAllTests: jest.fn().mockResolvedValue({ data: {} }),
  getAccuracy: jest.fn().mockResolvedValue({ data: {} }),
  simulateMessage: jest.fn().mockResolvedValue({ data: {} }),
  comparePromptVersions: jest.fn().mockResolvedValue({ data: {} }),
  generateAdversarial: jest.fn().mockResolvedValue({ data: {} }),
  getWorkflows: jest.fn().mockResolvedValue({ data: [] }),
  createWorkflow: jest.fn().mockResolvedValue({ data: {} }),
  getWorkflow: jest.fn().mockResolvedValue({ data: {} }),
  validateWorkflow: jest.fn().mockResolvedValue({ data: {} }),
  getTemplates: jest.fn().mockResolvedValue({ data: [] }),
  getTemplate: jest.fn().mockResolvedValue({ data: {} }),
  installTemplate: jest.fn().mockResolvedValue({ data: {} }),
  getAuditLog: jest.fn().mockResolvedValue({ data: [] }),
  getAuditStats: jest.fn().mockResolvedValue({ data: {} }),
  startExecution: jest.fn().mockResolvedValue({ data: {} }),
  getExecutions: jest.fn().mockResolvedValue({ data: [] }),
  getExecution: jest.fn().mockResolvedValue({ data: {} }),
  getExecutionSteps: jest.fn().mockResolvedValue({ data: [] }),
  getExecutionStats: jest.fn().mockResolvedValue({ data: {} }),
  approveStep: jest.fn().mockResolvedValue({ data: {} }),
  rejectStep: jest.fn().mockResolvedValue({ data: {} }),
  getPendingApprovals: jest.fn().mockResolvedValue({ data: [] }),
  approveApproval: jest.fn().mockResolvedValue({ data: {} }),
  rejectApproval: jest.fn().mockResolvedValue({ data: {} }),
  concludeABTest: jest.fn().mockResolvedValue({ data: {} }),
  diffPrompts: jest.fn().mockResolvedValue({ data: {} }),
  deleteKnowledgeDoc: jest.fn().mockResolvedValue({ data: {} }),
  testEcosystem: jest.fn().mockResolvedValue({ data: {} }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useTrainer hooks", () => {
  it("useEcosystems fetches ecosystems", async () => {
    const { result } = renderHook(() => useEcosystems(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useTrainerAgents fetches agents", async () => {
    const { result } = renderHook(() => useTrainerAgents(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useTrainerAgent fetches single agent", async () => {
    const { result } = renderHook(() => useTrainerAgent("a1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useSaveAgentConfig calls save", async () => {
    const { result } = renderHook(() => useSaveAgentConfig(), { wrapper })
    act(() => { result.current.mutate({ agentId: "a1", config: { model: "gpt-4" } }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("usePromptVersions fetches prompts", async () => {
    const { result } = renderHook(() => usePromptVersions("a1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useCreatePrompt calls create", async () => {
    const { result } = renderHook(() => useCreatePrompt(), { wrapper })
    act(() => { result.current.mutate({ agentId: "a1", payload: { prompt_text: "hello" } }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useKnowledgeSources fetches knowledge", async () => {
    const { result } = renderHook(() => useKnowledgeSources("a1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useTrainingPlans fetches plans", async () => {
    const { result } = renderHook(() => useTrainingPlans("a1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useWorkflows fetches workflows", async () => {
    const { result } = renderHook(() => useWorkflows(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useTemplates fetches templates", async () => {
    const { result } = renderHook(() => useTemplates(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useExecutions fetches executions", async () => {
    const { result } = renderHook(() => useExecutions(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("usePendingApprovals fetches approvals", async () => {
    const { result } = renderHook(() => usePendingApprovals(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
