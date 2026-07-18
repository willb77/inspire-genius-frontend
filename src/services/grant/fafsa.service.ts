import { agentApi } from "@/lib/agentApi"
import type {
  FafsaApplication,
  FafsaCompleteness,
  FafsaFieldCatalog,
  FafsaHandoff,
  FafsaPacket,
  GrantApiResponse,
} from "@/types/grant"

// FAFSA Application Concierge — the collect → packet → guided-handoff flow.
// Served under the GRANT vertical prefix /v1/agents/grant/fafsa/*.

const BASE = "/v1/agents/grant/fafsa"

function yearParams(awardYear?: string) {
  return awardYear ? { params: { awardYear } } : undefined
}

/** GET /fafsa/field-catalog — the collectable field registry the form renders from. */
export async function getFafsaFieldCatalog() {
  const { data } = await agentApi.get<GrantApiResponse<FafsaFieldCatalog>>(`${BASE}/field-catalog`)
  return data
}

/** GET /fafsa/application — the student's FAFSA application (get-or-create). */
export async function getFafsaApplication(awardYear?: string) {
  const { data } = await agentApi.get<GrantApiResponse<FafsaApplication>>(
    `${BASE}/application`,
    yearParams(awardYear)
  )
  return data
}

/** PATCH /fafsa/application/sections — merge collected non-tax answers. */
export async function updateFafsaSections(patch: Record<string, unknown>, awardYear?: string) {
  const { data } = await agentApi.patch<GrantApiResponse<FafsaApplication>>(
    `${BASE}/application/sections`,
    patch,
    yearParams(awardYear)
  )
  return data
}

/** GET /fafsa/application/completeness — per-section + overall completeness. */
export async function getFafsaCompleteness(awardYear?: string) {
  const { data } = await agentApi.get<GrantApiResponse<FafsaCompleteness>>(
    `${BASE}/application/completeness`,
    yearParams(awardYear)
  )
  return data
}

/** POST /fafsa/application/packet — generate + persist the prep packet. */
export async function generateFafsaPacket(awardYear?: string) {
  const { data } = await agentApi.post<
    GrantApiResponse<{ packet: FafsaPacket; application: FafsaApplication }>
  >(`${BASE}/application/packet`, {}, yearParams(awardYear))
  return data
}

/** GET /fafsa/application/handoff — the ordered StudentAid.gov handoff checklist. */
export async function getFafsaHandoff(awardYear?: string) {
  const { data } = await agentApi.get<GrantApiResponse<FafsaHandoff>>(
    `${BASE}/application/handoff`,
    yearParams(awardYear)
  )
  return data
}

/** PATCH /fafsa/application/handoff/{stepId} — mark a step pending/complete. */
export async function setFafsaHandoffStep(
  stepId: string,
  status: "pending" | "complete",
  awardYear?: string
) {
  const { data } = await agentApi.patch<GrantApiResponse<FafsaHandoff>>(
    `${BASE}/application/handoff/${encodeURIComponent(stepId)}`,
    { status },
    yearParams(awardYear)
  )
  return data
}
