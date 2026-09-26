import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { KeyRound, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRedeemPractitionerCode } from "@/hooks/user/useRedeemPractitionerCode"
import { registryErrorSummary } from "@/services/super-admin/practitioner-registry/registryErrors"
import { codeSchema } from "./practitionerCode.schema"

/**
 * "Have a practitioner code?" — Settings card for a client who signed up on
 * their own and later engaged a practitioner (Practitioner Programme PC-1c).
 *
 * They type the code their practitioner gave them once, and become that
 * practitioner's client. Nothing here lists or searches practitioners: the code
 * is the only way in, so the card can disclose nobody.
 *
 * The format check (`practitionerCode.schema.ts`) catches a typo before it
 * spends one of the account's limited attempts. The server remains authoritative.
 */

type CodeInput = z.input<typeof codeSchema>
type CodeOutput = z.output<typeof codeSchema>

export default function PractitionerCodeCard() {
  const redeem = useRedeemPractitionerCode()
  const [linkedTo, setLinkedTo] = useState<string | null>(null)
  const form = useForm<CodeInput, unknown, CodeOutput>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  })

  const onSubmit = form.handleSubmit((values) => {
    setLinkedTo(null)
    redeem.mutate(values.code, {
      onSuccess: (res) => {
        setLinkedTo(res.practitionerName)
        form.reset({ code: "" })
      },
    })
  })

  const fieldError = form.formState.errors.code?.message

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <KeyRound className="h-5 w-5" aria-hidden />
          Have a practitioner code?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          If you are working with a PRISM practitioner, enter the code they gave you to connect your account to theirs.
        </p>
      </CardHeader>
      <CardContent className="text-left">
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1 space-y-1">
            <Label htmlFor="practitioner-code">Practitioner code</Label>
            <Input
              id="practitioner-code"
              autoComplete="off"
              placeholder="ABC-DEF-GHJ"
              aria-invalid={!!fieldError}
              {...form.register("code")}
            />
          </div>
          <Button type="submit" disabled={redeem.isPending}>
            {redeem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Connect
          </Button>
        </form>
        {fieldError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {fieldError}
          </p>
        )}
        {redeem.error && !fieldError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {registryErrorSummary(redeem.error, "That code could not be used. Please try again.")}
          </p>
        )}
        {linkedTo && (
          <p role="status" className="mt-2 text-sm text-emerald-700">
            You are now connected to {linkedTo}.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
