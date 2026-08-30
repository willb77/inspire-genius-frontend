import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

/**
 * Mirrors the server rule in services/support-service/app/schemas.py
 * (MIN_DESCRIPTION_CHARS). Kept in sync so the user gets the guidance inline
 * instead of a round-trip 422.
 */
export const MIN_DESCRIPTION_CHARS = 30;
export const MAX_DESCRIPTION_CHARS = 4000;

export const supportRequestSchema = z.object({
  contactName: z
    .string()
    .min(1, "Your name is required")
    .max(200, "Name must be 200 characters or less"),
  contactEmail: z
    .string()
    .min(1, "An email address is required so we can reply")
    .email("Enter a valid email address")
    .max(320),
  contactPhone: z
    .string()
    .max(50, "Phone number must be 50 characters or less")
    .optional(),
  category: z.string().min(1, "Select what this is about"),
  priority: z.string().min(1, "Select a priority"),
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject must be 200 characters or less"),
  description: z
    .string()
    .min(
      MIN_DESCRIPTION_CHARS,
      `Please describe the issue in detail — at least ${MIN_DESCRIPTION_CHARS} characters. Include what you were doing, what you expected, and what actually happened.`,
    )
    .max(
      MAX_DESCRIPTION_CHARS,
      `Description must be ${MAX_DESCRIPTION_CHARS} characters or less`,
    ),
});

export type SupportRequestValues = z.infer<typeof supportRequestSchema>;

export type SupportRequestFormProps = {
  form: UseFormReturn<SupportRequestValues>;
  onSubmit: (values: SupportRequestValues) => Promise<void> | void;
  isSubmitting: boolean;
};

export const SUPPORT_CATEGORIES = [
  { value: "technical", label: "Technical problem" },
  { value: "account", label: "Account or login" },
  { value: "billing", label: "Billing or credits" },
  { value: "assessment", label: "PRISM assessment" },
  { value: "coaching", label: "Coaching or content" },
  { value: "feedback", label: "Feedback or suggestion" },
  { value: "other", label: "Something else" },
] as const;

export const SUPPORT_PRIORITIES = [
  { value: "low", label: "Low — a question, no rush" },
  { value: "normal", label: "Normal — I need help soon" },
  { value: "high", label: "High — blocking my work" },
  { value: "critical", label: "Critical — nobody can work" },
] as const;

/** Prompts shown under the description box so people know what detail to give. */
export const DESCRIPTION_PROMPTS = [
  "What were you trying to do?",
  "What did you expect to happen?",
  "What actually happened — any error message?",
  "When did it start, and does it happen every time?",
] as const;
