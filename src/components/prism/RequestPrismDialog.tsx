/**
 * RequestPrismDialog (G8) — survey-request entry point.
 *
 * - shadcn Dialog + React Hook Form + Zod (per `.claude/rules/frontend.md`).
 * - Pre-fills `forename`, `surname`, `email` from `useAuth()` user profile.
 * - On submit success: opens `action_url_1` in a new tab AND shows a Sonner
 *   toast.
 * - If `useMyPrismRequests()` shows an open (uncompleted) request: shows a
 *   "Survey already in progress — click here to reopen the link" CTA
 *   instead of the form.
 */
import { useEffect, useMemo } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/useAuth'
import {
  useMyPrismRequests,
  useRequestPrismSurvey,
} from '@/hooks/prism/usePrismRequest'
import type { PrismRequestRow } from '@/services/prism/prism'

// ── Zod schema ─────────────────────────────────────────────
const schema = z.object({
  forename: z.string().trim().min(1, 'First name is required').max(50),
  surname: z.string().trim().min(1, 'Last name is required').max(50),
  email: z.string().trim().email('Enter a valid email address'),
  organisation: z.string().trim().max(100).optional().or(z.literal('')),
  qtype_id: z.coerce.number().int().positive().optional(),
})

export type RequestPrismFormValues = z.infer<typeof schema>

export type RequestPrismDialogProps = {
  /** Controlled open state */
  open: boolean
  /** Called when the dialog should close (X / Escape / overlay / Cancel) */
  onOpenChange: (next: boolean) => void
}

// Statuses that mean "still outstanding — don't make the user start over"
const OPEN_STATUSES = new Set<string>([
  'pending',
  'sent',
  'in_progress',
  'initiated',
])

function findOpenRequest(rows: PrismRequestRow[] | undefined): PrismRequestRow | null {
  if (!rows || rows.length === 0) return null
  return (
    rows.find((r) => OPEN_STATUSES.has(String(r.quest_status_desc))) ?? null
  )
}

/** Best-effort split of an AuthUser display name into forename / surname. */
function splitName(name?: string | null): { forename: string; surname: string } {
  if (!name) return { forename: '', surname: '' }
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return { forename: parts[0] ?? '', surname: '' }
  return { forename: parts[0], surname: parts.slice(1).join(' ') }
}

export default function RequestPrismDialog({
  open,
  onOpenChange,
}: RequestPrismDialogProps) {
  const { user } = useAuth()
  const requestsQuery = useMyPrismRequests({ enabled: open })
  const requestMutation = useRequestPrismSurvey()

  const prefill = useMemo(() => {
    const { forename, surname } = splitName(user?.fullName ?? user?.name)
    return {
      forename,
      surname,
      email: user?.email ?? '',
      organisation: '',
      qtype_id: undefined as number | undefined,
    }
  }, [user?.fullName, user?.name, user?.email])

  const form = useForm<RequestPrismFormValues>({
    resolver: zodResolver(schema) as Resolver<RequestPrismFormValues>,
    defaultValues: prefill,
  })

  // Keep the form in sync with the auth user — `useAuth()` is sometimes
  // populated AFTER the dialog mounts (token-refresh path), so we reset
  // when the prefill values change while the dialog is open.
  useEffect(() => {
    if (open) form.reset(prefill)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill.forename, prefill.surname, prefill.email])

  const openRequest = findOpenRequest(requestsQuery.data?.items)

  function handleReopen() {
    if (openRequest?.action_url_1) {
      window.open(openRequest.action_url_1, '_blank', 'noopener,noreferrer')
      toast.success('Survey link opened — return here when complete.')
      onOpenChange(false)
    }
  }

  function onSubmit(values: RequestPrismFormValues) {
    const payload = {
      forename: values.forename,
      surname: values.surname,
      email: values.email,
      organisation: values.organisation?.trim() || undefined,
      qtype_id: values.qtype_id,
    }
    requestMutation.mutate(payload, {
      onSuccess: (data) => {
        if (data?.action_url_1) {
          window.open(data.action_url_1, '_blank', 'noopener,noreferrer')
        }
        toast.success('Survey link opened — return here when complete.')
        onOpenChange(false)
      },
      onError: () => {
        toast.error('Could not start your PRISM survey. Please try again.')
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take PRISM Assessment</DialogTitle>
          <DialogDescription>
            Request a PRISM Brain Mapping questionnaire. The survey link
            opens in a new tab — return here when you've completed it.
          </DialogDescription>
        </DialogHeader>

        {openRequest ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/50 p-4 text-sm">
              You already have a PRISM survey in progress.
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={handleReopen}
              disabled={!openRequest.action_url_1}
            >
              Survey already in progress — click here to reopen the link
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="forename"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Jane" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Smith" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jane.smith@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      PRISM sends the questionnaire link to this address.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organisation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={requestMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={requestMutation.isPending}>
                  {requestMutation.isPending
                    ? 'Requesting…'
                    : 'Request survey'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
