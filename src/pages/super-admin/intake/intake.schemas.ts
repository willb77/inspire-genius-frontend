import { z } from "zod"
import { SEGMENT_CONTEXTS, SEGMENT_STATUSES, type WebinarInput } from "@/types/intake"

/** The server's CHECK on `intake.webinars.public_description`. */
export const PUBLIC_DESCRIPTION_MAX = 2000

/**
 * The New / Edit session form. Mirrors the server rules in intake-service
 * `app/webinars.py`; the server is authoritative and lists every problem it
 * finds (capacity below the registrations already taken, an unknown zone, a
 * time the clocks skip), which the form shows alongside these.
 */
export const webinarFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300, "Title must be at most 300 characters"),
  // A datetime-local value: wall-clock time in `timeZone`.
  startsAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time"),
  timeZone: z.string().trim().min(1, "Choose a time zone"),
  // Held as text (an <input type="number"> value), checked, then made a number.
  capacity: z
    .string()
    .trim()
    .regex(/^\d+$/, "Places must be a whole number")
    .transform(Number)
    .refine((n) => n >= 1, "Places must be at least 1"),
  joinLink: z
    .string()
    .trim()
    .max(600, "Join link must be at most 600 characters")
    .refine((v) => v === "" || /^https:\/\//i.test(v), "Join link must start with https://"),
  segments: z
    .array(
      z.object({
        segment_status: z.enum(SEGMENT_STATUSES),
        segment_context: z.enum(SEGMENT_CONTEXTS),
      }),
    )
    .min(1, "Tick at least one segment"),
  status: z.enum(["scheduled", "completed"]).optional(),
  // The public events page (monorepo CSA 2026-11-10-public-events-list-csa.md).
  // Defaulted, so values that predate these fields still parse as "not public".
  isPublic: z.boolean().default(false),
  publicDescription: z
    .string()
    .trim()
    .max(PUBLIC_DESCRIPTION_MAX, `Public description must be at most ${PUBLIC_DESCRIPTION_MAX.toLocaleString("en-US")} characters`)
    .default(""),
})

export type WebinarFormInput = z.input<typeof webinarFormSchema>
export type WebinarFormValues = z.output<typeof webinarFormSchema>

/** Form values → the API body. `starts_at` is sent without an offset, so the server reads it in `time_zone`. */
export function toWebinarInput(values: WebinarFormValues): WebinarInput {
  const input: WebinarInput = {
    title: values.title,
    starts_at: `${values.startsAt}:00`,
    time_zone: values.timeZone,
    capacity: values.capacity,
    join_link: values.joinLink === "" ? null : values.joinLink,
    segments: values.segments,
  }
  if (values.status) input.status = values.status
  // Sent only when set, so a form that leaves them alone produces exactly the
  // body an intake service without the public events columns accepts (it
  // answers 422 "unknown field" to either key).
  if (values.isPublic) input.is_public = true
  if (values.publicDescription !== "") input.public_description = values.publicDescription
  return input
}

/**
 * The public fields an EDIT sends: only the ones the admin changed. Unticking
 * sends `false`; clearing the description sends `null`.
 */
export function publicFieldsForEdit(
  values: WebinarFormValues,
  dirty: { isPublic?: boolean; publicDescription?: boolean },
): Pick<WebinarInput, "is_public" | "public_description"> {
  const out: Pick<WebinarInput, "is_public" | "public_description"> = {}
  if (dirty.isPublic) out.is_public = values.isPublic
  if (dirty.publicDescription) out.public_description = values.publicDescription === "" ? null : values.publicDescription
  return out
}
