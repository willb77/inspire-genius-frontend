import { Compass, Sparkles, UserRoundSearch } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"

/**
 * Lumen's landing page — and the place the product explains itself.
 *
 * A user arriving here has usually followed a link and has no idea what Lumen
 * is. The surfaces below aren't self-explanatory from their names, so this page
 * states the proposition first, then says plainly how the parts relate — you
 * build a portrait, and it comes to you before things that matter.
 *
 * Personal coaching was dropped from this page 2026-08-12 (request), finishing
 * what the nav removal on 2026-08-06 started — see the note in
 * `constants/vertical-subnav.ts`. The route and the page itself are untouched
 * and still reachable directly; only the dashboard's entry point went, so this
 * page no longer names it at all.
 */

type Surface = {
  icon: typeof Compass
  title: string
  /** How the user reaches it — the answer to "what triggers this?". */
  trigger: string
  body: string
  to: string
}

const SURFACES: Surface[] = [
  {
    icon: UserRoundSearch,
    title: "My Self-Portrait",
    trigger: "Start here",
    body: "One coherent read across everything on file — your PRISM profile, any other assessments, your résumé, and your bio. PRISM leads, the rest corroborate, and where they disagree you're shown the disagreement rather than an average. Works from a single source; it just tells you that's what it's working from.",
    to: ROUTES.LUMEN.SELF_PORTRAIT,
  },
  {
    icon: Sparkles,
    title: "Prep Me",
    trigger: "Comes to you",
    body: "Short, specific guidance for the thing you're about to walk into — the difficult 1:1, the negotiation, the conversation you've been avoiding. Describe the situation and get a read grounded in your own profile, or let it arrive ahead of what's in your calendar.",
    to: ROUTES.LUMEN.MOMENTS,
  },
]

export default function LumenDashboard() {
  return (
    <div className="space-y-6 p-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Lumen</h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Lumen is your own behavioral profile, put to work.
        </p>
        <p className="max-w-3xl text-muted-foreground">
          It reads what's already on file about you — your PRISM assessment, anything
          else you've taken, your résumé, your bio — and turns it into one honest
          picture. Then it uses that picture: it comes to you before the moments
          that are hard to get right. It's for you, not your employer: nothing
          here is shared with anyone, and nothing is graded.
        </p>
      </header>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm">
            <span className="font-medium">How the two fit together.</span>{" "}
            <span className="text-muted-foreground">
              Your <strong className="font-medium text-foreground">Self-Portrait</strong>{" "}
              is the foundation — the more it has to read, the sharper everything else
              gets. <strong className="font-medium text-foreground">Prep Me</strong> is
              what that foundation is for: it arrives on its own when something is
              coming up, so you don't have to think to ask.
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {SURFACES.map(({ icon: Icon, title, trigger, body, to }) => (
          <Card key={title} className="flex flex-col transition-colors hover:bg-muted/50">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-primary">
                {trigger}
              </span>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3 text-sm text-muted-foreground">
              <p>{body}</p>
              <Link to={to} className="font-medium text-primary hover:underline">
                Open {title}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
