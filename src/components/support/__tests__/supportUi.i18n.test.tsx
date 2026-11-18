/**
 * @jest-environment jsdom
 *
 * A10-b1: the support form's category, priority and description-prompt wording moved into the `supportUi`
 * namespace. English must not move.
 *
 *  1. Every registry entry's key resolves in public/locales/en/supportUi.json to exactly the entry's English
 *     text (the default the form passes to t), and the English file has no key the registries do not use.
 *     (The jest react-i18next mock ignores defaults, so this is the only check on them.)
 *  2. The form, rendered under the real-en-json mock, shows the original English for the prompts.
 */
import { render, screen } from "@testing-library/react"
import { useForm } from "react-hook-form"

import SupportRequestForm from "../SupportRequestForm"
import {
  DESCRIPTION_PROMPTS,
  DESCRIPTION_PROMPT_KEYS,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  type SupportRequestValues,
} from "@/types/support/component-types"
import en from "../../../../public/locales/en/supportUi.json"

function flatten(o: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key))
    else out[key] = String(v)
  }
  return out
}

describe("supportUi registry", () => {
  const flat = flatten(en)
  const entries: [string, string][] = [
    ...SUPPORT_CATEGORIES.map((c) => [c.labelKey, c.label] as [string, string]),
    ...SUPPORT_PRIORITIES.map((p) => [p.labelKey, p.label] as [string, string]),
    ...DESCRIPTION_PROMPTS.map((p, i) => [DESCRIPTION_PROMPT_KEYS[i], p] as [string, string]),
  ]

  it("covers every entry (a loop over nothing would pass vacuously)", () => {
    expect(entries.length).toBe(15)
    expect(DESCRIPTION_PROMPT_KEYS.length).toBe(DESCRIPTION_PROMPTS.length)
  })

  it.each(entries)("%s resolves to its English default", (key, label) => {
    expect(flat[key]).toBe(label)
  })

  it("English file has no orphan key", () => {
    expect(Object.keys(flat).sort()).toEqual(entries.map(([k]) => k).sort())
  })
})

function Harness() {
  const form = useForm<SupportRequestValues>({
    defaultValues: { contactName: "", contactEmail: "", category: "", priority: "", subject: "", description: "" },
  })
  return <SupportRequestForm form={form} onSubmit={() => undefined} isSubmitting={false} />
}

describe("SupportRequestForm English prompts are unchanged", () => {
  it("placeholder and helper text", () => {
    render(<Harness />)
    const prompts = [
      "What were you trying to do?",
      "What did you expect to happen?",
      "What actually happened — any error message?",
      "When did it start, and does it happen every time?",
    ]
    const box = screen.getByPlaceholderText(/Please describe the issue in detail\. For example:/)
    expect(box.getAttribute("placeholder")).toBe(
      "Please describe the issue in detail. For example:\n" + prompts.map((p) => `• ${p}`).join("\n"),
    )
    expect(screen.getByText(`Helpful things to include: ${prompts.join(" ")}`)).toBeInTheDocument()
  })
})
