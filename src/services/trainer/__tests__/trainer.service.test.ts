/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  getEcosystems,
  getTrainerAgents,
  getTrainerAgent,
  saveAgentConfig,
  getAgentMaturity,
  getPromptVersions,
  getActivePrompt,
  createPrompt,
  publishPrompt,
  getKnowledgeSources,
  searchKnowledge,
  getTrainingPlans,
  createTrainingPlan,
  getAgentCosts,
  getEvaluationTests,
  runAllTests,
  simulateMessage,
  getWorkflows,
  createWorkflow,
  getTemplates,
  installTemplate,
  getAuditLog,
  startExecution,
  getExecutions,
  getPendingApprovals,
  approveApproval,
} from "../trainer.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("trainer.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getEcosystems gets /v1/trainer/ecosystems", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getEcosystems()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/ecosystems")
  })

  it("getTrainerAgents gets with ecosystem param", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getTrainerAgents("ig")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents", { params: { ecosystem_id: "ig" } })
  })

  it("getTrainerAgent gets agent by id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { id: "a1" } } })
    await getTrainerAgent("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents/a1", expect.any(Object))
  })

  it("saveAgentConfig posts config", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await saveAgentConfig("a1", { model: "gpt-4" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/agents/a1/config", { model: "gpt-4" }, expect.any(Object))
  })

  it("getAgentMaturity gets maturity", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { level: 3 } } })
    await getAgentMaturity("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents/a1/maturity")
  })

  it("getPromptVersions gets agent prompts", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getPromptVersions("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents/a1/prompts")
  })

  it("getActivePrompt gets active prompt", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { version: 1 } } })
    await getActivePrompt("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents/a1/prompts/active")
  })

  it("createPrompt posts new prompt", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { version: 2 } } })
    await createPrompt("a1", { prompt_text: "hello" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/agents/a1/prompts", { prompt_text: "hello" })
  })

  it("publishPrompt posts publish", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await publishPrompt("a1", 2)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/agents/a1/prompts/2/publish")
  })

  it("getKnowledgeSources gets knowledge", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getKnowledgeSources("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents/a1/knowledge")
  })

  it("searchKnowledge posts search", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: [] } })
    await searchKnowledge("a1", "test", 5)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/agents/a1/knowledge/search", { query: "test", top_k: 5 })
  })

  it("getTrainingPlans gets plans", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getTrainingPlans("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents/a1/plans")
  })

  it("createTrainingPlan posts plan", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await createTrainingPlan("a1", { name: "Plan 1" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/agents/a1/plans", { name: "Plan 1" })
  })

  it("getAgentCosts gets costs with days param", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await getAgentCosts("a1", 7)
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents/a1/costs", { params: { days: 7 } })
  })

  it("getEvaluationTests gets tests", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getEvaluationTests("a1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/agents/a1/tests")
  })

  it("runAllTests posts run", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await runAllTests("a1")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/agents/a1/tests/run")
  })

  it("simulateMessage posts simulation", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await simulateMessage("a1", "hello")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/agents/a1/simulate", expect.objectContaining({ message: "hello" }))
  })

  it("getWorkflows gets /v1/trainer/workflows", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getWorkflows()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/workflows")
  })

  it("createWorkflow posts workflow", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await createWorkflow({ name: "wf1", dag_config: {} })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/workflows", expect.any(Object))
  })

  it("getTemplates gets with category", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getTemplates("coaching")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/templates", { params: { category: "coaching" } })
  })

  it("installTemplate posts install", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await installTemplate("t1", "a1")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/templates/t1/install", { agent_config_id: "a1" })
  })

  it("getAuditLog gets audit", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getAuditLog({ limit: 10 })
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/audit", { params: { limit: 10 } })
  })

  it("startExecution posts execution", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await startExecution("wf1", "trigger")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/workflows/wf1/execute", { trigger_input: "trigger" })
  })

  it("getExecutions gets with pagination", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getExecutions(10, 0)
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/executions", { params: { limit: 10, offset: 0 } })
  })

  it("getPendingApprovals gets pending", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await getPendingApprovals()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/trainer/approvals/pending")
  })

  it("approveApproval posts approval", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await approveApproval("ap1", "admin")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/trainer/approvals/ap1/approve", { approved_by: "admin" })
  })
})
