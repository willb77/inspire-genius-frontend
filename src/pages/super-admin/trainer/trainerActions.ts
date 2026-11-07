import {
  Settings2, MessageSquare, BookOpen,
  Target, DollarSign, GitBranch, ListChecks, ShieldCheck,
} from "lucide-react"

/** The per-agent options each tile exposes. Segments match the routes
 *  registered in routes.tsx under /super-admin/agent-trainer/:agentId/*. */
export const AGENT_TILE_ACTIONS = [
  { segment: "prompt", label: "Prompt", icon: Settings2, hint: "Prompt Studio — system prompt, versions, A/B" },
  { segment: "knowledge", label: "Knowledge", icon: BookOpen, hint: "Knowledge Manager — sources, uploads, coverage" },
  { segment: "test", label: "Test", icon: MessageSquare, hint: "Conversation Simulator — try prompts against the agent" },
  { segment: "training", label: "Training", icon: Target, hint: "Training Plans — goals, progress, maturity" },
  { segment: "costs", label: "Costs", icon: DollarSign, hint: "Cost & ROI for this agent" },
] as const

/** Trainer tools that are not scoped to a single agent. Routes for all three
 *  already existed; none of them was reachable from anywhere in the UI —
 *  Workflows only via the Process Builder nav item, and Executions/Approvals
 *  from no link at all. */
export const TRAINER_TOOLS = [
  {
    to: "/super-admin/agent-trainer/workflows",
    label: "Workflow Designer",
    icon: GitBranch,
    blurb: "Compose multi-agent DAG plans on a canvas and save them as templates.",
  },
  {
    to: "/super-admin/agent-trainer/executions",
    label: "Executions",
    icon: ListChecks,
    blurb: "History of workflow runs, with per-step traces, latency and cost.",
  },
  {
    to: "/super-admin/agent-trainer/approvals",
    label: "Approvals",
    icon: ShieldCheck,
    blurb: "Human-in-the-loop queue for steps a workflow paused on.",
  },
] as const
