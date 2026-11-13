import { z } from "zod";

/** Add-approver form. The server re-checks everything and owns the capability list. */
export const approverSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter their email address.")
    .email("Enter a valid email address.")
    .transform((v) => v.toLowerCase()),
  capability: z.string().min(1, "Choose a control."),
});
