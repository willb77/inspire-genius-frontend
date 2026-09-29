import { agentApi } from "@/lib/agentApi"
import type {
  AddRegistryInput,
  AssignablePractitioner,
  AssignInput,
  AssignResult,
  EditRegistryInput,
  RegionOption,
  RegistryRow,
} from "@/types/practitioner-registry"

/**
 * Practitioner PRISM registry API (super-admin only).
 *
 * Calls `agentApi`, NOT the monolith `api` instance — these routes live on the
 * agent-engine and are reached through `/v1/agents/{proxy+}`.
 */
const BASE = "/v1/agents/practitioner-registry"

type Envelope<T> = { status: boolean; data: T }

export async function listRegistry(includeInactive = false): Promise<RegistryRow[]> {
  const { data } = await agentApi.get<Envelope<RegistryRow[]>>(BASE, {
    params: { includeInactive: includeInactive || undefined },
  })
  return data.data
}

export async function addPractitioner(input: AddRegistryInput): Promise<RegistryRow> {
  const { data } = await agentApi.post<Envelope<RegistryRow>>(BASE, input)
  return data.data
}

export async function bulkAddPractitioners(csv: string): Promise<{ added: number }> {
  const { data } = await agentApi.post<Envelope<{ added: number }>>(`${BASE}/bulk`, { csv })
  return data.data
}

export async function editPractitioner({ practitionerSub, ...fields }: EditRegistryInput): Promise<RegistryRow> {
  const { data } = await agentApi.patch<Envelope<RegistryRow>>(
    `${BASE}/${encodeURIComponent(practitionerSub)}`,
    fields,
  )
  return data.data
}

export async function setPractitionerActive(practitionerSub: string, active: boolean): Promise<RegistryRow> {
  const action = active ? "reactivate" : "deactivate"
  const { data } = await agentApi.post<Envelope<RegistryRow>>(
    `${BASE}/${encodeURIComponent(practitionerSub)}/${action}`,
  )
  return data.data
}

export async function listRegions(): Promise<RegionOption[]> {
  const { data } = await agentApi.get<Envelope<RegionOption[]>>(`${BASE}/regions`)
  return data.data
}

export async function listAssignable(region: string, country: string): Promise<AssignablePractitioner[]> {
  const { data } = await agentApi.get<Envelope<AssignablePractitioner[]>>(`${BASE}/assignable`, {
    params: { region, country },
  })
  return data.data
}

export async function assignClient(input: AssignInput): Promise<AssignResult> {
  const { data } = await agentApi.post<Envelope<AssignResult>>(`${BASE}/assignments`, input)
  return data.data
}

/** PC-1c: issue a new practitioner code. The old one stops working at once. */
export async function regeneratePractitionerCode(practitionerSub: string): Promise<RegistryRow> {
  const { data } = await agentApi.post<Envelope<RegistryRow>>(
    `${BASE}/${encodeURIComponent(practitionerSub)}/regenerate-code`,
  )
  return data.data
}
