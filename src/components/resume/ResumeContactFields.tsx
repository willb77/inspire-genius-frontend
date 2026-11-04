/**
 * RWO-2 — the contact block for the downloaded résumé (guide §10: contact
 * details in the body, never only in a header).
 *
 * Held in page state only: never sent to the server, never written to storage —
 * a shared classroom computer would otherwise keep one student's phone number
 * for the next (CSA Q4). Saving it belongs with the master profile (RWO-6).
 */
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ResumeContact } from "@/lib/resume/resumeDocument"

const FIELDS: { key: keyof ResumeContact; label: string; placeholder: string; type?: string }[] = [
  { key: "name", label: "Name", placeholder: "First Last" },
  { key: "location", label: "City, State", placeholder: "Springfield, IL" },
  { key: "phone", label: "Phone", placeholder: "(555) 555-0100", type: "tel" },
  { key: "email", label: "Email", placeholder: "you@example.com", type: "email" },
  { key: "link", label: "LinkedIn or portfolio", placeholder: "linkedin.com/in/you" },
]

export interface ResumeContactFieldsProps {
  value: ResumeContact
  onChange: (next: ResumeContact) => void
}

export function ResumeContactFields({ value, onChange }: ResumeContactFieldsProps) {
  return (
    <div className="space-y-2" data-testid="resume-contact-fields">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`rw-contact-${f.key}`}>{f.label}</Label>
          <Input
            id={`rw-contact-${f.key}`}
            type={f.type ?? "text"}
            autoComplete="off"
            value={value[f.key]}
            placeholder={f.placeholder}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Printed at the top of your downloaded résumé. Not sent anywhere and not saved — re-enter it next visit.
      </p>
    </div>
  )
}
