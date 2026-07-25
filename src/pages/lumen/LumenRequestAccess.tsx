import { Mail, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * What an unentitled user sees at `/vertical/lumen`.
 *
 * **This is deliberately not a paywall.** Lumen access is granted, not purchased
 * (build plan §7 — the Stripe paygate was removed 2026-07-17), so there is no
 * plan, no price, and no checkout here. The honest message is "not switched on
 * for your account yet", with a way to ask.
 *
 * Core's `RequireVertical` would redirect an unentitled user to `/home`, which
 * for a B2C visitor who followed a link to Lumen reads as the product silently
 * not existing. So `LumenLayout` renders this instead — the patch lives in the
 * vertical layer, leaving Core's gate untouched.
 */
export default function LumenRequestAccess() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-lg">
        <CardHeader className="space-y-2">
          <Sparkles className="h-6 w-6 text-muted-foreground" aria-hidden />
          <CardTitle>Lumen isn't switched on for your account yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Lumen turns your behavioural profile into guidance you can use in the
            moment — before the difficult conversation, not after it.
          </p>
          <p>
            Access is enabled by your administrator or the Inspire Genius team.
            There's nothing to buy here.
          </p>
          <Button asChild variant="outline">
            <a href="mailto:support@3pp.com?subject=Lumen%20access%20request">
              <Mail className="mr-1 h-4 w-4" aria-hidden />
              Request access
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
