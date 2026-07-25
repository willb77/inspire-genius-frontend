import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useConsent, useUpdateConsent } from "@/hooks/lumen/useConsent"
import type { ConsentUpdate } from "@/types/lumen"

/**
 * Lumen settings — consent for proactive guidance.
 *
 * Three separate switches rather than one, because the grants are genuinely
 * different in kind: an in-app feed item is not the same act as reading someone's
 * calendar, which is not the same act as emailing them. Collapsing them into
 * "notifications on/off" would ask for more than it needs.
 *
 * Each switch states what it actually does and what the default is, so a user
 * who never touches this page still knows where they stand.
 */

type Grant = {
  key: keyof ConsentUpdate
  label: string
  body: string
  /** Shown when the grant is off, to explain what turning it on buys. */
  note?: string
}

const GRANTS: Grant[] = [
  {
    key: "proactive",
    label: "Moments in my feed",
    body: "Let Lumen add unprompted Moments — a weekly check-in, and guidance before things you're preparing for. Nothing leaves the app; they appear in your Moments feed.",
  },
  {
    key: "calendar",
    label: "Use my bookings for timing",
    body: "Let Lumen read your coaching bookings so a Moment can arrive before a session you're preparing for, rather than at a random time.",
    note: "Off by default. Lumen can't see your work calendar — only bookings made in Inspire Genius.",
  },
  {
    key: "email",
    label: "Email me Moments",
    body: "Deliver Moments outside the app as well as in your feed.",
    note: "Off by default, and not yet available — turning this on won't send anything until email delivery ships.",
  },
]

export default function LumenSettings() {
  const { data: consent, isLoading, isError } = useConsent()
  const { mutate: update, isPending } = useUpdateConsent()

  if (isLoading) {
    return (
      <div className="space-y-4 p-6" data-testid="consent-loading">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !consent) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              We couldn't load your settings
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Try again in a moment. Your existing choices are unchanged.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Lumen settings</h1>
        <p className="max-w-2xl text-muted-foreground">
          You decide when Lumen speaks up without being asked, and what it's allowed
          to look at.
        </p>
        {consent.is_default && (
          <Badge variant="outline">Showing defaults — you haven't changed these yet</Badge>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proactive guidance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {GRANTS.map((grant) => {
            const enabled = Boolean(consent[grant.key])
            return (
              <div
                key={grant.key}
                className="flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <label
                    htmlFor={`consent-${grant.key}`}
                    className="text-sm font-medium"
                  >
                    {grant.label}
                  </label>
                  <p className="text-sm text-muted-foreground">{grant.body}</p>
                  {!enabled && grant.note && (
                    <p className="text-xs text-muted-foreground">{grant.note}</p>
                  )}
                </div>
                <Switch
                  id={`consent-${grant.key}`}
                  checked={enabled}
                  disabled={isPending}
                  aria-label={grant.label}
                  onCheckedChange={(next) => update({ [grant.key]: next })}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Your assessment data is yours. Turning a grant off stops future Moments of
        that kind; it never deletes what you've already saved.
      </p>
    </div>
  )
}
