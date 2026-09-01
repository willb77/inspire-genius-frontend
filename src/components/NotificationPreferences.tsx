import { Bell, BellOff, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationPreferences() {
  const {
    isSupported,
    isConfigured,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  } = useNotifications()

  const handleToggle = async (checked: boolean) => {
    try {
      if (checked) {
        await subscribe()
      } else {
        await unsubscribe()
      }
    } catch {
      // Error is handled by the hook
    }
  }

  if (!isSupported) {
    return (
      <Card className="shadow-none sm:shadow-sm">
        <CardHeader className="text-left">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Browser can do push, but this deployment has no VAPID key, so a toggle
  // here could never deliver anything. Say so rather than presenting a
  // control that silently fails.
  if (!isConfigured) {
    return (
      <Card className="shadow-none sm:shadow-sm">
        <CardHeader className="text-left">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not yet switched on for this environment.
            Your browser supports them — the platform is not sending them yet.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const isDenied = permission === 'denied'

  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about coaching sessions, updates, and important activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle" className="text-sm font-medium">
              Enable push notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? 'You will receive push notifications on this device.'
                : 'Turn on to receive push notifications on this device.'}
            </p>
          </div>
          <Switch
            id="push-toggle"
            checked={isSubscribed}
            disabled={loading || isDenied}
            onCheckedChange={handleToggle}
          />
        </div>

        {isDenied && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">
              Notifications are blocked by your browser. To enable them, open
              your browser settings and allow notifications for this site.
            </p>
          </div>
        )}

        {permission === 'default' && !isSubscribed && (
          <p className="text-xs text-muted-foreground">
            Your browser will ask for permission when you enable notifications.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
