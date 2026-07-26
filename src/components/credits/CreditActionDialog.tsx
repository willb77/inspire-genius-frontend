import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

/** One field in a credit-action form. `amount` is validated as a positive number. */
export type CreditField = {
  name: string
  label: string
  kind: "amount" | "text"
  required?: boolean
  placeholder?: string
}

export type CreditActionValues = Record<string, string>

/**
 * A minimal, self-contained credit-write dialog: a set of labelled inputs and a
 * submit button. Shared by the distributor (purchase / allocate) and
 * practitioner (use) write controls. Validation is intentionally light — a
 * required `amount` field must parse to a number > 0; required text fields must
 * be non-empty. On submit it hands the raw string values to `onSubmit`; the
 * caller maps them into the typed request body.
 */
export function CreditActionDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  fields,
  isPending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  submitLabel: string
  fields: CreditField[]
  isPending: boolean
  onSubmit: (values: CreditActionValues) => void
}) {
  const [values, setValues] = useState<CreditActionValues>({})

  function setField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function invalidField(f: CreditField): boolean {
    const raw = (values[f.name] ?? "").trim()
    if (f.kind === "amount") {
      const n = Number(raw)
      return raw === "" || Number.isNaN(n) || n <= 0
    }
    return !!f.required && raw === ""
  }

  const hasError = fields.some(invalidField)

  function handleOpenChange(next: boolean) {
    if (!next) setValues({})
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasError || isPending) return
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => {
            const id = `credit-field-${f.name}`
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={id}>
                  {f.label}
                  {f.required ? <span className="text-[#EF4444]">*</span> : null}
                </Label>
                <Input
                  id={id}
                  name={f.name}
                  type={f.kind === "amount" ? "number" : "text"}
                  min={f.kind === "amount" ? 1 : undefined}
                  inputMode={f.kind === "amount" ? "numeric" : undefined}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                  aria-invalid={invalidField(f)}
                />
              </div>
            )
          })}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={hasError || isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
