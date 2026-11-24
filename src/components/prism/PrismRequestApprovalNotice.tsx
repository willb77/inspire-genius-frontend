import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock, Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useRequestPrismAccess } from '@/hooks/prism/usePrismRequestAccess'
import {
  PRISM_REQUEST_APPROVAL_MESSAGE,
  apiErrorMessage,
  type PrismRequestAccessState,
} from '@/services/prism/prism'
import { withPrism } from "@/lib/withPrism"

function makeAccessSchema(t: TFunction) {
  return z.object({
    practitionerName: z
      .string()
      .trim()
      .min(
        1,
        t('approvalNotice.errPractitionerRequired', {
          defaultValue: 'Enter the name of the PRISM Practitioner who provided your access',
        }),
      )
      .max(200),
    confirmIsMe: z
      .boolean()
      .refine((v) => v, t('approvalNotice.errConfirmIsMe', { defaultValue: 'Confirm that this is you' })),
  })
}

type AccessFormValues = z.infer<ReturnType<typeof makeAccessSchema>>

interface PrismRequestApprovalNoticeProps {
  /** The server's state, when it has been read. */
  state?: PrismRequestAccessState | null
  /** The signed-in account, shown while the server's copy is not yet read. */
  fallbackAccount: { name: string; email: string }
  /** Open the dialog immediately (e.g. right after a refused request). */
  defaultOpen?: boolean
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

/**
 * The approval notice: the message every blocked caller sees, the state of
 * their request, and the small dialog that asks for approval. Name and email
 * are shown read-only — the server records the account's own, whatever the
 * page shows.
 */
export function PrismRequestApprovalNotice({
  state,
  fallbackAccount,
  defaultOpen = false,
}: PrismRequestApprovalNoticeProps) {
  const { t } = useTranslation('prismUi')
  const accessSchema = useMemo(() => makeAccessSchema(t), [t])
  const [open, setOpen] = useState(defaultOpen && !state?.pending)
  const requestAccess = useRequestPrismAccess()
  const account = {
    name: state?.account?.name || fallbackAccount.name,
    email: state?.account?.email || fallbackAccount.email,
  }
  const last = state?.request ?? null
  const pending = !!state?.pending
  const sentDate = last ? formatDate(last.requested_at) : ''
  const practitionerName = last?.practitioner_name ?? ''
  const waitingMessage =
    sentDate && practitionerName
      ? t('approvalNotice.waitingSentPractitioner', {
          defaultValue: 'Your request is waiting for approval (sent {{date}}) — practitioner: {{name}}.',
          date: sentDate,
          name: practitionerName,
        })
      : sentDate
        ? t('approvalNotice.waitingSent', {
            defaultValue: 'Your request is waiting for approval (sent {{date}}).',
            date: sentDate,
          })
        : practitionerName
          ? t('approvalNotice.waitingPractitioner', {
              defaultValue: 'Your request is waiting for approval — practitioner: {{name}}.',
              name: practitionerName,
            })
          : t('approvalNotice.waiting', { defaultValue: 'Your request is waiting for approval.' })

  const form = useForm<AccessFormValues>({
    resolver: zodResolver(accessSchema) as Resolver<AccessFormValues>,
    defaultValues: { practitionerName: '', confirmIsMe: false },
  })

  async function onSubmit(values: AccessFormValues) {
    try {
      await requestAccess.mutateAsync({
        practitionerName: values.practitionerName,
        confirmIsMe: values.confirmIsMe,
      })
      toast.success(
        t('approvalNotice.sentToast', { defaultValue: 'Your request has been sent for approval.' }),
      )
      setOpen(false)
      form.reset()
    } catch (err) {
      form.setError('root', {
        message: apiErrorMessage(err) ||
          t('approvalNotice.sendFailed', { defaultValue: 'Your request could not be sent. Please try again.' }),
      })
    }
  }

  return (
    <div
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3 dark:border-amber-700 dark:bg-amber-950/40"
      role="status"
      aria-label={t('approvalNotice.ariaLabel', { defaultValue: 'PRISM survey requests need prior approval' })}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <p className="text-sm">{PRISM_REQUEST_APPROVAL_MESSAGE}</p>
      </div>

      {pending && last && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {waitingMessage}
        </p>
      )}
      {!pending && last?.status === 'denied' && (
        <p className="text-sm text-muted-foreground">
          {t('approvalNotice.denied', { defaultValue: 'Your last request was not approved. You can ask again.' })}
        </p>
      )}

      {!pending && (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {t('approvalNotice.requestAccess', { defaultValue: 'Request access' })}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{withPrism(t('approvalNotice.dialogTitle', { defaultValue: 'Request access to PRISM surveys' }))}</DialogTitle>
            <DialogDescription>{PRISM_REQUEST_APPROVAL_MESSAGE}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="prism-access-name" className="text-sm font-medium">
                    {t('approvalNotice.yourName', { defaultValue: 'Your name' })}
                  </label>
                  <Input id="prism-access-name" value={account.name} readOnly disabled />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prism-access-email" className="text-sm font-medium">
                    {t('approvalNotice.yourEmail', { defaultValue: 'Your email' })}
                  </label>
                  <Input id="prism-access-email" value={account.email} readOnly disabled />
                </div>
              </div>

              <FormField
                control={form.control}
                name="confirmIsMe"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {t('approvalNotice.confirmLabel', { defaultValue: 'Confirm this is you' })}
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="practitionerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {withPrism(t('approvalNotice.practitionerLabel', { defaultValue: 'PRISM Practitioner who provided your access *' }))}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('approvalNotice.practitionerPlaceholder', { defaultValue: "Practitioner's name" })} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root?.message && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t('approvalNotice.cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button type="submit" disabled={requestAccess.isPending}>
                  {requestAccess.isPending && (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  )}
                  {t('approvalNotice.sendRequest', { defaultValue: 'Send request' })}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
