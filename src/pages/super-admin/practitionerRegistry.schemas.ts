import { z } from "zod"

/** Form schemas for the Practitioner Registry page. Mirror the server rules in app/practitioner_registry/validation.py; the server is authoritative. */

export const CSV_TEMPLATE =
  "practitioner_email,site_id,client_id,ig_reference,external_ident,region,country\n"

const idField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(128, `${label} must be at most 128 characters`)
    .regex(/^\S+$/, `${label} must not contain spaces`)

export const fieldsSchema = z.object({
  siteId: idField("Site ID"),
  clientId: idField("Client ID"),
  reference: idField("IG Reference"),
  externalIdent: idField("ExternalIdent"),
  region: z.string().trim().min(1, "Region is required").max(64, "Region must be at most 64 characters"),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Country must be a two-letter code, e.g. US")
    .transform((v) => v.toUpperCase()),
})

export const addSchema = fieldsSchema.extend({
  practitionerEmail: z.string().trim().email("Enter the practitioner's account email"),
})

export const assignSchema = z.object({
  region: z.string().min(1, "Choose a region"),
  country: z.string().min(1, "Choose a country"),
  practitionerSub: z.string().min(1, "Choose a practitioner"),
  clientEmail: z.string().trim().email("Enter the client's account email"),
})
