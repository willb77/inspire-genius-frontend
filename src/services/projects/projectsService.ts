import { getApi } from "@/lib/agentApi";

/**
 * Projects service — Meridian per-project conversation scopes.
 *
 * ──────────────────────────────────────────────────────────────────────
 * STATUS: STUBBED — NO BACKEND YET (Surface 1 / Meridian Chat, Phase 1).
 *
 * The wiring plan (scripts/build_ig_surfaces_wiring_plan.py, Surface 1
 * Phase 2) calls for a real `projects` table in the agent-engine DB plus
 * GET/POST/PATCH/DELETE /v1/projects routes, with project_id FKs added to
 * `documents` and `agent_conversations`. None of that exists today.
 *
 * Until those endpoints ship, `listProjects()` returns a small set of
 * demo projects so the SixTileRail can render the Projects / Instructions
 * tiles faithfully to the wireframe. `getApi()` is imported so the wiring
 * is trivial once the backend lands: swap each function body for the real
 * `getApi().get("/v1/projects")` call and delete the demo data.
 *
 * TODO(backend): implement GET /v1/projects, POST /v1/projects,
 *   PATCH /v1/projects/{id}, DELETE /v1/projects/{id} in services/agent-engine,
 *   then replace the stub bodies below with real axios calls through getApi().
 * ──────────────────────────────────────────────────────────────────────
 */

export type Project = {
  id: string;
  name: string;
  description?: string;
  /** System guidance Meridian applies to every chat scoped to this project. */
  instructions?: string;
};

// Demo data — wireframe parity only. Remove when the backend ships.
const DEMO_PROJECTS: Project[] = [
  {
    id: "grance",
    name: "Grance partnership",
    description: "Active diligence + comms plan",
    instructions:
      "You are advising on the Grance Partners diligence. Default to balanced framing — call out enthusiasm and red flags side by side. Use plain English; no buzzwords. When citing PRISM, lead with behavior, then dimension. Defer pricing discussion to Maven.",
  },
  {
    id: "onboard-summer",
    name: "Summer cohort onboarding",
    description: "8 new hires · Forge-led",
    instructions: "",
  },
  {
    id: "fafsa-outreach",
    name: "FAFSA first-gen outreach",
    description: "Bridge + Grant comms",
    instructions: "",
  },
  {
    id: "manager-readout",
    name: "Q3 manager readouts",
    description: "Atlas dashboards · Maven interviews",
    instructions: "",
  },
];

/** Touch the api factory so the import is exercised and the swap is trivial. */
function ensureApi(): void {
  void getApi;
}

export async function listProjects(): Promise<Project[]> {
  ensureApi();
  // TODO(backend): return (await getApi().get("/v1/projects")).data.projects;
  return Promise.resolve(DEMO_PROJECTS);
}

export async function updateProjectInstructions(
  projectId: string,
  instructions: string,
): Promise<Project> {
  ensureApi();
  // TODO(backend): return (await getApi().patch(`/v1/projects/${projectId}`, { instructions })).data;
  const existing =
    DEMO_PROJECTS.find((p) => p.id === projectId) ?? DEMO_PROJECTS[0];
  return Promise.resolve({ ...existing, instructions });
}
