import { z } from "zod"

/** CX-5 — one message to the exercise. Trimmed; never blank. */
export const MAX_MESSAGE_CHARS = 4000

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Type a message first.")
    .max(MAX_MESSAGE_CHARS, `Keep it under ${MAX_MESSAGE_CHARS} characters.`),
})

export type ChatMessageForm = z.infer<typeof chatMessageSchema>
