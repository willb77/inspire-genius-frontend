import { ROUTES } from "@/constants/routes"

/**
 * The house-style Administration pages that are one page with tabs (Wave 1).
 * Every tab is an existing route; see AdminHub.
 */

export type HubTab = {
  key: string
  label: string
  /** Where the tab goes when it is not the open one. */
  to: string
  /** One plain sentence shown under the tabs while this tab is open. */
  description: string
  /** Shown on hover when the tab leaves the page (e.g. to choose a coach first). */
  hint?: string
}

export type HubDef = {
  title: string
  description: string
  tabs: readonly HubTab[]
}

export const PRISM_HUB: HubDef = {
  title: "PRISM",
  description: "Work-style profiles: the scores on file, the AI coach's PRISM knowledge, accuracy checks and report files.",
  tabs: [
    {
      key: "scores",
      label: "Scores",
      to: ROUTES.SUPER_ADMIN.PRISM_MANAGEMENT,
      description: "The PRISM scores on file for each person. Add, correct or remove a person's scores.",
    },
    {
      key: "exam",
      label: "Exam",
      to: ROUTES.SUPER_ADMIN.PRISM_EXAM,
      description: "A test of how well the AI coach knows PRISM. Start a run, then read what it got wrong.",
    },
    {
      key: "accuracy",
      label: "Accuracy check",
      to: ROUTES.SUPER_ADMIN.PRISM_ACCURACY_SCORER,
      description: "Checks what the AI coach told someone about their PRISM profile against the scores on file for them.",
    },
    {
      key: "convert",
      label: "Convert a report",
      to: ROUTES.SUPER_ADMIN.PRISM_CSV_CONVERTER,
      description: "Turns a long-format PRISM export into the standard report file. The file stays in your browser.",
    },
  ],
}

export const USAGE_HUB: HubDef = {
  title: "Usage & costs",
  description: "How the platform is being used and what the AI coaches cost.",
  tabs: [
    {
      key: "activity",
      label: "Activity",
      to: ROUTES.SUPER_ADMIN.ANALYTICS,
      description: "People, organizations and coach use across the platform, and the audit trail.",
    },
    {
      key: "health",
      label: "AI usage & health",
      to: ROUTES.SUPER_ADMIN.OBSERVABILITY,
      description: "What the AI coaches did today: answers, speed, errors and spend.",
    },
    {
      key: "coach",
      label: "Cost per coach",
      to: ROUTES.SUPER_ADMIN.AGENT_TRAINER,
      description: "Spend and return for one coach over the last 30 days.",
      hint: "Choose a coach in Agent Trainer, then Costs.",
    },
  ],
}
