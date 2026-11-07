import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useMinorConsentStatus } from "@/hooks/useMinorConsent"
import type { MinorGateSurface } from "@/types/minorConsent"

/** Shown only if the server refused without a message of its own. */
const FALLBACK_MESSAGE =
  "This part of Inspires Genius isn't available on your account yet. Nothing is wrong with your account. " +
  "If you have questions, ask your school contact."

type MinorGateProps = {
  surface: MinorGateSurface
  children: ReactNode
}

/**
 * N-2: an honest page in place of a gated surface — never a blank one.
 *
 * Renders `children` unchanged unless the server's status says, explicitly,
 * that the switch applies to this person AND this surface is refused. While the
 * status loads, if it fails, or with the switch off, the page is exactly what
 * it is today: the server enforces the gate on every gated route, so this
 * component only decides what a refused person sees.
 */
export default function MinorGate({ surface, children }: MinorGateProps) {
  const { data } = useMinorConsentStatus()
  const decision = data?.enabled === true ? data.surfaces?.[surface] : undefined
  if (!decision || decision.allowed !== false) return <>{children}</>
  return <MinorGateNotice message={decision.message || FALLBACK_MESSAGE} />
}

export function MinorGateNotice({ message }: { message: string }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <section
        role="status"
        aria-labelledby="minor-gate-title"
        className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <ShieldCheck className="h-6 w-6 text-slate-500" aria-hidden="true" />
        </div>
        <h1 id="minor-gate-title" className="mb-2 text-base font-semibold text-slate-800">
          Not available yet
        </h1>
        <p className="mb-4 text-sm text-slate-600">{message}</p>
        <Link to={ROUTES.HOME} className="text-sm font-medium text-[#127A8A] underline-offset-2 hover:underline">
          Go to Home
        </Link>
      </section>
    </main>
  )
}
