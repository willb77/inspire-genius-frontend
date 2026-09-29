/** Practitioner PRISM registry — one row per practitioner (PC-1a). */
export type RegistryRow = {
  practitionerSub: string
  email: string | null
  displayName: string
  siteId: string
  clientId: string
  reference: string
  externalIdent: string
  region: string
  country: string
  practitionerCode: string | null
  active: boolean
  deactivatedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type RegistryFields = {
  siteId: string
  clientId: string
  reference: string
  externalIdent: string
  region: string
  country: string
}

export type AddRegistryInput = RegistryFields & { practitionerEmail: string }

export type EditRegistryInput = { practitionerSub: string } & Partial<RegistryFields>

export type RegionOption = { region: string; countries: string[] }

export type AssignablePractitioner = {
  practitionerSub: string
  displayName: string
  email: string | null
}

export type AssignInput = { clientEmail: string; practitionerSub: string }

export type AssignResult = { clientId: string; clientSub: string; practitionerSub: string }

/** One validation problem, as the registry routes return them in a 422 `detail` list. */
export type RegistryError = { row: number | null; field: string; message: string }

/** POST /v1/agents/practitioner-registry/redeem — the practitioner's name, and nothing else (PC-1c). */
export type RedeemResult = { practitionerName: string }
