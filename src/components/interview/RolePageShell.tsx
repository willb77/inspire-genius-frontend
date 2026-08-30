/**
 * Public shell for the Interview Practice role pages. These are marketing /
 * landing pages that funnel into the (auth-gated) Interview Practice coach, so
 * they render outside the app layouts with their own light chrome and a clear
 * call to action into `/interview-practice`.
 */
import { Link } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"

export default function RolePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Inspire Genius
          </Link>
          <Button asChild size="sm">
            <Link to={ROUTES.INTERVIEW_PRACTICE}>
              Start practicing <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-6 text-xs text-slate-500">
          <Link to={ROUTES.INTERVIEW_PRACTICE_ROLES} className="hover:text-slate-700">
            All interview role guides
          </Link>
          <Link to={ROUTES.INTERVIEW_PRACTICE} className="hover:text-slate-700">
            Interview Practice
          </Link>
          <Link to="/terms" className="hover:text-slate-700">Terms</Link>
          <Link to="/privacy" className="hover:text-slate-700">Privacy</Link>
          <span className="ml-auto">Wage &amp; outlook figures are planning references, not offers.</span>
        </div>
      </footer>
    </div>
  )
}
