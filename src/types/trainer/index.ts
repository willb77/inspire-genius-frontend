// ── Agent Types ─────────────────────────────────────────────────────
export type AgentConfig = {
  id: string
  ecosystem_id: string
  agent_id: string
  name: string
  role_subtitle?: string | null
  domain: "coaching" | "business" | "system"
  avatar_url?: string | null
  status: "active" | "training" | "paused" | "ab-testing"
  maturity_level: number // 1-5
  canvas_config?: Record<string, unknown> | null
  config_id?: string | null
  created_at?: string
}

export type AgentMetrics = {
  agent_id: string
  avg_rating: number
  total_interactions: number
  error_rate: number
  maturity_level: number
  knowledge_doc_count: number
  prompt_version: number
}

export type MaturityAssessment = {
  level: number
  criteria_met: Record<string, boolean>
  next_level_requirements: string[]
  progress_to_next: number
}

// ── Prompt Types ────────────────────────────────────────────────────
export type AgentPrompt = {
  id: string
  agent_config_id: string
  version: number
  prompt_text: string
  sections?: Record<string, string> | null
  status: "draft" | "active" | "ab-testing" | "archived"
  token_count: number
  created_by?: string | null
  created_at: string
  published_at?: string | null
}

export type PromptABTest = {
  id: string
  agent_config_id: string
  variant_a_id: string
  variant_b_id: string
  traffic_split: number
  status: "running" | "concluded"
  winner_id?: string | null
  total_impressions_a: number
  total_impressions_b: number
  avg_rating_a: number
  avg_rating_b: number
  started_at: string
  concluded_at?: string | null
}

// ── Knowledge Types ─────────────────────────────────────────────────
export type KnowledgeSource = {
  id: string
  agent_config_id: string
  name: string
  description?: string | null
  source_type: string
  document_count: number
  total_chunks: number
  created_at: string
}

export type KnowledgeDocument = {
  id: string
  source_id: string
  filename: string
  s3_key: string
  content_type: string
  file_size_bytes: number
  chunk_count: number
  tags?: Record<string, unknown> | null
  indexed_at?: string | null
  uploaded_by?: string | null
  created_at: string
}

export type SearchResult = {
  document_id: string
  filename: string
  chunk_text: string
  similarity_score: number
  metadata?: Record<string, unknown> | null
}

// ── Training Types ──────────────────────────────────────────────────
export type TrainingPlan = {
  id: string
  agent_config_id: string
  name: string
  description?: string | null
  status: "draft" | "active" | "completed" | "paused"
  target_accuracy: number
  target_maturity: number
  start_date?: string | null
  target_end_date?: string | null
  actual_end_date?: string | null
  created_by?: string | null
  created_at: string
}

export type TrainingGoal = {
  id: string
  plan_id: string
  title: string
  description?: string | null
  goal_type: "accuracy" | "knowledge_coverage" | "satisfaction" | "response_quality" | "cost_reduction" | "guardrail_compliance"
  target_value: number
  current_value: number
  unit: string
  measurement_method?: string | null
  status: "not_started" | "in_progress" | "achieved" | "failed"
  weight: number
  evaluated_at?: string | null
  created_at: string
}

export type TrainingProgress = {
  plan_id: string
  overall_progress: number
  goals: TrainingGoal[]
  cost_to_date: number
  days_elapsed: number
  days_remaining?: number | null
}

// ── Cost Types ──────────────────────────────────────────────────────
export type CostSummary = {
  agent_id: string
  total_usd: number
  by_category: Record<string, number>
  by_operation: Record<string, number>
  cost_per_interaction: number
  period: string
  trend: Array<{ date: string; amount: number }>
}

export type ROIReport = {
  agent_id: string
  period: string
  total_cost: number
  total_value: number
  roi_percent: number
  break_even_days?: number | null
  value_breakdown: Record<string, number>
  cost_breakdown: Record<string, number>
}

export type BudgetStatus = {
  budget_id: string
  period: string
  limit_usd: number
  spent_usd: number
  utilization_pct: number
  alert_triggered: boolean
}

// ── Evaluation Types ────────────────────────────────────────────────
export type EvaluationTest = {
  id: string
  agent_config_id: string
  title: string
  input_prompt: string
  expected_behavior: string
  scoring_rubric?: Record<string, unknown> | null
  category: string
  priority: string
  created_at: string
}

export type EvaluationResult = {
  id: string
  test_id: string
  prompt_version: number
  passed: boolean
  score: number
  response_text?: string | null
  latency_ms: number
  tokens_used: number
  cost_usd: number
  run_at: string
}

export type AccuracyReport = {
  agent_id: string
  composite_score: number
  test_pass_rate: number
  rlhf_rating_normalized: number
  expert_validation_score: number
  guardrail_compliance_rate: number
  trend: Array<{ date: string; score: number }>
}

export type TestSuiteResult = {
  total_tests: number
  passed: number
  failed: number
  accuracy_pct: number
  results: EvaluationResult[]
}

// ── Workflow Types ──────────────────────────────────────────────────
export type WorkflowTemplate = {
  id: string
  name: string
  description?: string | null
  dag_config: { nodes: DAGNode[]; edges: DAGEdge[] }
  trigger_intents?: string[] | null
  agent_sequence?: string[] | null
  estimated_duration_seconds: number
  created_at: string
}

export type DAGNode = {
  id: string
  type: "start" | "agent" | "decision" | "human" | "parallel_split" | "parallel_join" | "merge" | "end"
  data: Record<string, unknown>
  position: { x: number; y: number }
}

export type DAGEdge = {
  id: string
  source: string
  target: string
  label?: string
}

// ── Template Types ──────────────────────────────────────────────────
export type TrainingTemplate = {
  id: string
  name: string
  category: string
  target_agent_domain?: string | null
  description?: string | null
  manifest: Record<string, unknown>
  author?: string | null
  version: string
  downloads: number
  rating: number
  template_type: "training" | "workflow"
  dag_config?: { nodes: DAGNode[]; edges: DAGEdge[] } | null
  created_at: string
}

// ── Ecosystem Types ─────────────────────────────────────────────────
export type EcosystemConfig = {
  ecosystem_id: string
  ecosystem_name: string
  status: string
}

// ── Simulator Types ─────────────────────────────────────────────────
export type SimulatorMessage = {
  role: "user" | "agent"
  text: string
  tokens_input?: number
  tokens_output?: number
  cost_usd?: number
  latency_ms?: number
  timestamp: string
}

export type SimulatorSession = {
  session_id: string
  agent_id: string
  messages: SimulatorMessage[]
  prompt_version: number
  created_at: string
}

// ── Audit Types ─────────────────────────────────────────────────────
export type AuditEntry = {
  id: string
  action: string
  agent_id?: string | null
  actor_email?: string | null
  target_type?: string | null
  target_id?: string | null
  details?: Record<string, unknown> | null
  source: "trainer" | "workflow"
  created_at: string
}

// ── Execution Types ────────────────────────────────────────────────
export type WorkflowExecution = {
  id: string
  workflow_id?: string | null
  ecosystem_id: string
  status: "pending" | "running" | "completed" | "failed" | "paused"
  trigger_input: string
  final_output?: string | null
  total_cost_usd: number
  total_tokens: number
  total_latency_ms: number
  step_count: number
  started_at?: string | null
  completed_at?: string | null
  created_by?: string | null
  created_at: string
}

export type ExecutionStep = {
  id: string
  execution_id: string
  step_index: number
  agent_id: string
  agent_name: string
  task_description: string
  input_context?: Record<string, unknown> | null
  output_text?: string | null
  tokens_input: number
  tokens_output: number
  cost_usd: number
  latency_ms: number
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "paused"
  error_message?: string | null
  wave_number: number
  started_at?: string | null
  completed_at?: string | null
}

export type ExecutionStats = {
  total_executions: number
  success_rate: number
  avg_cost_usd: number
  avg_duration_ms: number
  most_failed_agents: Array<{ agent_id: string; failure_count: number }>
}
