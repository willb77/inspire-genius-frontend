import { Compass, Sparkles, UserRoundSearch } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"

/**
 * Lumen's landing page — placeholder shell.
 *
 * PR-1 wires the vertical end to end (manifest, gate, route, backend mount).
 * The three surfaces below are the real product and land next: the Behavioral
 * Self-Portrait composer, the just-in-time Moments feed, and the personal
 * coaching thread. This page exists so the route renders something honest in
 * the meantime rather than a blank frame.
 */

type Surface = {
  icon: typeof Compass
  title: string
  body: string
  /** Present once the surface is built; absent surfaces render without a link. */
  to?: string
}

const SURFACES: Surface[] = [
  {
    icon: UserRoundSearch,
    title: "My Self-Portrait",
    body: "One coherent read across every assessment you've taken — PRISM leading, other instruments corroborating, with the convergences and tensions called out.",
    to: ROUTES.LUMEN.SELF_PORTRAIT,
  },
  {
    icon: Sparkles,
    title: "Moments",
    body: "Short, context-aware guidance when it's actually useful — before the difficult 1:1, ahead of the negotiation, at the start of the week.",
  },
  {
    icon: Compass,
    title: "Personal coaching",
    body: "A coaching thread that already knows your profile, so you don't spend the first ten minutes explaining yourself.",
  },
]

export default function LumenDashboard() {
  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Lumen</h1>
        <p className="text-muted-foreground">
          Personal behavioral diagnostics and just-in-time coaching. Coming
          together now — here's what's on the way.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {SURFACES.map(({ icon: Icon, title, body, to }) => (
          <Card key={title} className={to ? "transition-colors hover:bg-muted/50" : undefined}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{body}</p>
              {to && (
                <Link to={to} className="inline-block font-medium text-primary hover:underline">
                  Open
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
