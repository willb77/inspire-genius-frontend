import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type { MarketSalaries } from "@/types/direction-setting"

/**
 * Stage 4 — "What does that pay?". The client for the market-data route.
 *
 * Like the rest of Direction Setting this lives on the Agent Engine, so it goes
 * through `getApi()`/`agentApi` — never the monolith `api` instance.
 * `/v1/agents/*` is the only prefix API Gateway routes to the engine; a bare
 * `/v1/...` path falls through to the monolith and 404s in the browser while
 * passing every test.
 *
 * ## One call, and it is a plain read
 *
 * Unlike stages 6, 9 and 10 this is not on the job path. The route prices the
 * caller's ranked career areas out of a table already in the process — no
 * model, no vector search, nothing that could outrun API Gateway's 30-second
 * cap — so it answers in the request.
 *
 *     GET /market/salaries?limit=n   -> {areas, ranked, provider, asOf, note}
 *
 * Self-scoped: the ranking is the caller's own PRISM, taken from their claims.
 * There is no subject to pass and none to tamper with.
 *
 * ## What the caller must not do with the response
 *
 * `area.range`, `occupation.salary` and `occupation.outlook` are each
 * independently nullable, and a null means **we hold nothing**, not zero.
 * There is deliberately no fallback row on the backend — the GRANT `_FALLBACK`
 * that invented $38,000 for anything unknown was retired for this reason — so
 * a surface that coalesces a null to `0`, or to a national average, reintroduces
 * the exact defect the nulls exist to prevent.
 */
const PREFIX = "/v1/agents/direction-setting"

/**
 * GET /market/salaries — wage ranges for the caller's ranked career areas.
 *
 * `limit` bounds how many areas are priced and is clamped server-side to 1–9.
 * A caller with no PRISM on file gets all nine areas unranked (`ranked: false`)
 * with a `note` saying why, rather than an empty page or an error — that is a
 * genuinely useful screen for exactly the person who most needs it.
 */
export async function getMarketSalaries(limit = 5) {
  const { data } = await getApi().get<VerticalApiResponse<MarketSalaries>>(
    `${PREFIX}/market/salaries`,
    { params: { limit } }
  )
  return data
}
