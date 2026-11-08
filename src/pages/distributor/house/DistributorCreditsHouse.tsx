import { Link } from "react-router-dom"
import DistributorLayout from "@/layouts/DistributorLayout"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { formatDate } from "@/lib/house/formatDate"
import { ROUTES } from "@/constants/routes"
import {
  useDistributorCredits,
  useDistributorPractitioners,
  useDistributorTransactions,
} from "@/hooks/distributor/useDistributor"
import {
  CREDITS_WRITE,
  DistributorAllocateControl,
  DistributorPurchaseControl,
} from "@/components/credits/CreditsWriteControls"
import {
  formatCredits,
  formatShare,
  readCredits,
  readPractitioners,
  readTransactions,
  transactionLabel,
} from "./distributorData"
import { Section, StatTile } from "./parts"

/**
 * Credits, house style (switch: `distributor`).
 *
 * The three totals the server reports, per-practitioner use from the real
 * roster, and the real ledger. No sample totals, no sample trend chart. When
 * buying and giving credits here is switched off, the page says so instead of
 * showing a button that does nothing.
 */
export default function DistributorCreditsHouse({ writeEnabled = CREDITS_WRITE }: { writeEnabled?: boolean }) {
  const credits = useDistributorCredits()
  const practs = useDistributorPractitioners()
  const txs = useDistributorTransactions()

  const figures = credits.error ? null : readCredits(credits.data)
  const practitioners = practs.error ? null : readPractitioners(practs.data)
  const transactions = txs.error ? null : readTransactions(txs.data)

  return (
    <DistributorLayout>
      <PageHeader
        title="Credits"
        description="Buy PRISM assessment credits and give them to your practitioners."
        action={
          writeEnabled ? (
            <div className="flex items-center gap-2">
              <DistributorAllocateControl />
              <DistributorPurchaseControl />
            </div>
          ) : undefined
        }
      />

      {!writeEnabled && (
        <PageState
          kind="unavailable"
          className="mb-6"
          message="Buying and giving credits here isn't available yet. To order credits, contact us."
          action={
            <Link to={ROUTES.HELP} className="text-sm text-primary hover:underline">
              Contact us
            </Link>
          }
        />
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Credits available" value={formatCredits(figures?.available)} loading={credits.isLoading} />
        <StatTile label="Given to practitioners" value={formatCredits(figures?.given)} loading={credits.isLoading} />
        <StatTile label="Used by practitioners" value={formatCredits(figures?.used)} loading={credits.isLoading} />
      </div>

      <div className="space-y-4">
        <Section title="Credits by practitioner">
          {practs.isLoading ? (
            <PageState kind="loading" rows={3} />
          ) : practs.error ? (
            <PageState
              kind="error"
              message="We couldn't load your practitioners."
              onRetry={() => void practs.refetch()}
            />
          ) : !practitioners ? (
            <PageState kind="unavailable" message="Credits by practitioner aren't available yet." />
          ) : practitioners.length === 0 ? (
            <PageState
              kind="empty"
              title="No practitioners yet"
              message="Once practitioners join your network, you'll see how many credits each has used."
            />
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Credits given to and used by each practitioner</caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Practitioner</th>
                  <th className="py-2 font-medium">Given</th>
                  <th className="py-2 font-medium">Used</th>
                  <th className="py-2 font-medium">Share used</th>
                </tr>
              </thead>
              <tbody>
                {practitioners.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 text-foreground">{p.name}</td>
                    <td className="py-2 text-foreground">{formatCredits(p.given)}</td>
                    <td className="py-2 text-foreground">{formatCredits(p.used)}</td>
                    <td className="py-2 text-foreground">{formatShare(p.used, p.given)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Credit history">
          {txs.isLoading ? (
            <PageState kind="loading" rows={4} />
          ) : txs.error ? (
            <PageState
              kind="error"
              message="We couldn't load your credit history."
              onRetry={() => void txs.refetch()}
            />
          ) : !transactions ? (
            <PageState kind="unavailable" message="Credit history isn't available yet." />
          ) : transactions.length === 0 ? (
            <PageState
              kind="empty"
              title="No credit activity yet"
              message="Credits you buy or give to practitioners will be listed here."
            />
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Credit history, newest first</caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">What happened</th>
                  <th className="py-2 font-medium">Credits</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 text-muted-foreground">{formatDate(t.createdAt)}</td>
                    <td className="py-2 text-foreground">
                      {transactionLabel(t.type)}
                      {t.description ? <span className="text-muted-foreground"> · {t.description}</span> : null}
                    </td>
                    <td className="py-2 font-medium text-foreground">{formatCredits(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </DistributorLayout>
  )
}
