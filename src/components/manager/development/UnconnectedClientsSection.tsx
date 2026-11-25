/**
 * TDS-U11b — the practitioner's clients who have not connected an account yet.
 *
 * growth-service sends these (U11a, switch `tds_practitioner_client_roster`)
 * as roster cards with no `memberId`. With no account there is no development
 * page, so each card says so plainly and opens nothing on its own. It offers
 * two real places instead: the client record (sessions, documents, follow-ups
 * and PRISM import, keyed on the client id) and My Clients, where the invite
 * is sent. While the switch is off the server sends no such card and this
 * renders nothing.
 */
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { UserX } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useUnconnectedClients } from "@/hooks/manager/development/useTeamDevelopmentRoster"
import { ROUTES } from "@/constants/routes"
import { cn } from "@/lib/utils"
import { useDevSkin } from "./skin"

export function UnconnectedClientsSection({ search = "" }: { search?: string }) {
  const { t: tp } = useTranslation("practitionerPages")
  const sk = useDevSkin()
  const { data } = useUnconnectedClients()
  const q = search.trim().toLowerCase()
  const clients = (data ?? []).filter((c) => !q || c.name.toLowerCase().includes(q))
  if (clients.length === 0) return null

  return (
    <section className="space-y-3" data-testid="unconnected-clients" aria-labelledby="unconnected-clients-heading">
      <h2 id="unconnected-clients-heading" className={cn("text-sm font-semibold", sk.text700)}>
        {tp("studioRoster.notConnectedHeading", {
          defaultValue: "Clients who have not connected an account ({{count}})",
          count: clients.length,
        })}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clients.map((c) => (
          <Card
            key={c.clientId}
            data-testid="unconnected-client-card"
            className={cn("flex flex-col gap-2 border-dashed p-4", sk.radius, sk.border200)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("truncate text-sm font-semibold", sk.text900)}>{c.name}</span>
              <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", sk.border200, sk.text500)}>
                <UserX className="h-3 w-3" aria-hidden="true" />
                {tp("studioRoster.notConnected", { defaultValue: "Not connected yet" })}
              </span>
            </div>
            <p className={cn("text-xs", sk.text500)}>
              {tp("studioRoster.notConnectedBody", {
                defaultValue:
                  "{{name}} has no InspiresGenius account linked to you yet, so there is no development page to open. Invite them from My Clients.",
                name: c.name,
              })}
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-medium">
              <Link
                to={ROUTES.PRACTITIONER.CLIENT_DETAIL.replace(":clientId", encodeURIComponent(c.clientId))}
                className="text-[#3B5BFF] hover:underline"
              >
                {tp("studioRoster.openClientRecord", { defaultValue: "Open client record" })}
              </Link>
              <Link to={ROUTES.PRACTITIONER.CLIENTS} className="text-[#3B5BFF] hover:underline">
                {tp("studioRoster.inviteFromMyClients", { defaultValue: "Invite from My Clients" })}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default UnconnectedClientsSection
