import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type { ManagerFitView } from "@/types/job-fit"

/**
 * TS-4b — the person's own notices: each time a manager or coach they share
 * with scored their fit against a role on demand.
 *
 * GET /v1/blueprint/fit/manager-run/mine. Self-scoped on the server (the
 * subject is the signed-in person; there is no id to pass). Its own module,
 * apart from `fit.service`, so the many suites that stub `fitService` are not
 * each made to answer for a call they do not exercise; `jest.setup.ts` gives it
 * an empty default.
 */
export function getManagerFitViews() {
  return api.get<BaseApiResponse<ManagerFitView[]>>("/v1/blueprint/fit/manager-run/mine")
}
