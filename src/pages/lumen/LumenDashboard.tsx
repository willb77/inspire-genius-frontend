import { Compass, Sparkles, UserRoundSearch } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Lumen's landing page — placeholder shell.
 *
 * PR-1 wires the vertical end to end (manifest, gate, route, backend mount).
 * The three surfaces below are the real product and land next: the Behavioral
 * Self-Portrait composer, the just-in-time Moments feed, and the personal
 * coaching thread. This page exists so the route renders something honest in
 * the meantime rather than a blank frame.
 */

const SURFACES = [
  {
    icon: UserRoundSearch,
    title: "My Self-Portrait",
    body: "One coherent read across every assessment you've taken — PRISM leading, other instruments corroborating, with the convergences and tensions called out.",
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
] as const

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
        {SURFACES.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {body}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
