import { ROUTES } from "@/constants/routes"

/** Stage id (server) → page (client). Ids are the server's; see app/tools/career_discovery/stages.py. */
export const STAGE_ROUTES: Record<string, string> = {
  land: ROUTES.CAREER_DISCOVERY.JOURNEY,
  about: ROUTES.CAREER_DISCOVERY.ABOUT,
  who: ROUTES.CAREER_DISCOVERY.WHO,
  careers: ROUTES.CAREER_DISCOVERY.CAREERS,
  pays: ROUTES.CAREER_DISCOVERY.PAYS,
  goals: ROUTES.CAREER_DISCOVERY.GOALS,
  alignment: ROUTES.CAREER_DISCOVERY.ALIGNMENT,
  education: ROUTES.CAREER_DISCOVERY.EDUCATION,
  cost: ROUTES.CAREER_DISCOVERY.COST,
  plan: ROUTES.CAREER_DISCOVERY.PLAN,
}

export const STATE_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Done",
  skipped: "Skipped",
}
