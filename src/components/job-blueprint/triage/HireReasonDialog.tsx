import { useEffect } from "react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const MAX_REASON = 2000

const makeSchema = (t: TFunction) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(1, t("hire.val.required", { defaultValue: "Say why this candidate is being marked hired" }))
      .max(MAX_REASON, t("hire.val.max", { defaultValue: "At most {{max}} characters", max: MAX_REASON })),
  })
type FormValues = z.infer<ReturnType<typeof makeSchema>>

/**
 * Asks for the reason before a candidate is marked hired. The reason is
 * recorded on the stage change with the person who made it; it is not shown
 * to the candidate.
 */
export function HireReasonDialog({
  open,
  onOpenChange,
  candidateCode,
  pending,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateCode: string
  pending: boolean
  /** The server's refusal, shown in the dialog rather than closing it. */
  error?: string | null
  onConfirm: (reason: string) => void
}) {
  const { t } = useTranslation("jobBlueprintPages")
  const form = useForm<FormValues>({ resolver: zodResolver(makeSchema(t)), defaultValues: { reason: "" } })
  const { register, handleSubmit, reset, formState } = form

  useEffect(() => {
    if (open) reset({ reason: "" })
  }, [open, reset])

  const onSubmit = handleSubmit((values) => onConfirm(values.reason))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("hire.title", { defaultValue: "Mark candidate {{code}} hired", code: candidateCode })}</DialogTitle>
            <DialogDescription>
              {t("hire.description", { defaultValue: "Record why. The reason is kept with this step and with who made it." })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="hire-reason">{t("hire.reason", { defaultValue: "Reason" })}</Label>
            <Textarea id="hire-reason" rows={4} {...register("reason")} />
            {formState.errors.reason ? (
              <p className="text-xs text-destructive">{formState.errors.reason.message}</p>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              {t("hire.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("hire.saving", { defaultValue: "Saving…" }) : t("hire.submit", { defaultValue: "Mark hired" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
