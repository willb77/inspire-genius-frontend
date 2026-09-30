/**
 * Form schemas for My development's two self-declare forms.
 *
 * Separate file so the schema is importable from a test without pulling the
 * component (and its React Query providers) in with it, matching
 * `components/settings/practitionerCode.schema.ts`.
 *
 * The bounds mirror what growth-service will accept, so a typo is caught here
 * rather than coming back as a 422 the person has to interpret. The server
 * stays authoritative either way.
 */
import { z } from "zod"

/** POST /me/gaps. `severity` defaults to the server's own default. */
export const selfGapSchema = z.object({
  competency: z
    .string()
    .trim()
    .min(2, "Say what you want to get better at — at least a couple of characters.")
    .max(200, "Keep this under 200 characters."),
  severity: z.enum(["critical", "moderate", "minor"]),
})

/**
 * POST /me/learning-items.
 *
 * `provider` is optional because the server defaults it to `""`; an empty
 * string is sent as omitted rather than as a blank provider, so the row does
 * not claim a provider called "".
 */
export const selfLearningSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give it a title — at least a couple of characters.")
    .max(300, "Keep the title under 300 characters."),
  provider: z.string().trim().max(200, "Keep the provider under 200 characters."),
})
