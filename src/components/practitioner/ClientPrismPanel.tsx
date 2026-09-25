import type { ClientPrism } from "@/types/practitioner/coachClient"

/** Canon order and names — PRISM has four colours, and Orange is not one. */
const COLOURS = ["Gold", "Green", "Blue", "Red"] as const

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

interface ClientPrismPanelProps {
  prism: ClientPrism
  clientName: string
}

/**
 * A client's PRISM as the server-side reader states it. Every way of seeing
 * nothing says which one it is: a practitioner who has not been shared with
 * must never read that as "this client has no PRISM".
 */
export function ClientPrismPanel({ prism, clientName }: ClientPrismPanelProps) {
  if (prism.state === "shared" && prism.colours) {
    const colours = prism.colours
    return (
      <div className="space-y-2" data-testid="client-prism-shared">
        {COLOURS.map((name) => {
          const raw = colours[name]
          const score = typeof raw === "number" ? Math.round(raw) : null
          return (
            <div key={name} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm font-medium text-[#111827]">{name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5e7eb]">
                <div
                  className="h-full rounded-full bg-[#3B5BFF]"
                  style={{ width: `${Math.min(100, score ?? 0)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm tabular-nums text-[#6b7280]">
                {score ?? "—"}
              </span>
            </div>
          )
        })}
        {prism.assessedAt && (
          <p className="text-xs text-[#6b7280]">Assessed {formatDate(prism.assessedAt)}</p>
        )}
      </div>
    )
  }

  if (prism.state === "not_shared") {
    return (
      <p className="text-sm text-[#6b7280]">
        {clientName} hasn&rsquo;t shared their PRISM with you. They can share it from their
        Sharing page.
      </p>
    )
  }

  if (prism.state === "not_linked") {
    return (
      <p className="text-sm text-[#6b7280]">
        {clientName} doesn&rsquo;t have a platform account linked to this client record yet, so
        there is nothing for them to share.
      </p>
    )
  }

  if (prism.state === "no_prism") {
    return (
      <p className="text-sm text-[#6b7280]">
        {clientName} has shared their PRISM with you, but no report is on file yet.
      </p>
    )
  }

  return (
    <p role="alert" className="text-sm text-[#B91C1C]">
      PRISM couldn&rsquo;t be loaded just now. This is a failure, not an empty profile — try again
      shortly.
    </p>
  )
}

export default ClientPrismPanel
