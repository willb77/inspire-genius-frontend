import DistributorLayout from "@/layouts/DistributorLayout"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { useDistributorPractitioners, useDistributorTransactions } from "@/hooks/distributor/useDistributor"
import { formatCredits, readPractitioners, readTransactions } from "./distributorData"
import { byMonth, byRegion } from "./reports"
import { Section } from "./parts"

/**
 * Reports, house style (switch: `distributor`).
 *
 * Built only from the roster and the credit ledger the server actually
 * returns. The classic page's charts are sample figures with no warning, so
 * they are not shown here.
 */
export default function DistributorReportsHouse() {
  const practs = useDistributorPractitioners()
  const txs = useDistributorTransactions()
  const practitioners = practs.error ? null : readPractitioners(practs.data)
  const transactions = txs.error ? null : readTransactions(txs.data)

  const regions = practitioners ? byRegion(practitioners) : []
  const months = transactions ? byMonth(transactions) : []

  return (
    <DistributorLayout>
      <PageHeader title="Reports" description="How your credits are being used, by region and by month." />
      <div className="space-y-4">
        <Section title="Credits by region">
          {practs.isLoading ? (
            <PageState kind="loading" rows={3} />
          ) : practs.error ? (
            <PageState
              kind="error"
              message="We couldn't load this report."
              onRetry={() => void practs.refetch()}
            />
          ) : !practitioners ? (
            <PageState kind="unavailable" message="This report isn't available yet." />
          ) : regions.length === 0 ? (
            <PageState
              kind="empty"
              title="Nothing to report yet"
              message="This fills in once practitioners join your network."
            />
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Practitioners and credits given and used, by region</caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Region</th>
                  <th className="py-2 font-medium">Practitioners</th>
                  <th className="py-2 font-medium">Credits given</th>
                  <th className="py-2 font-medium">Credits used</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((r) => (
                  <tr key={r.region} className="border-b border-border last:border-b-0">
                    <td className="py-2 text-foreground">{r.region}</td>
                    <td className="py-2 text-foreground">{r.practitioners}</td>
                    <td className="py-2 text-foreground">{formatCredits(r.given)}</td>
                    <td className="py-2 text-foreground">{formatCredits(r.used)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Credits by month">
          {txs.isLoading ? (
            <PageState kind="loading" rows={3} />
          ) : txs.error ? (
            <PageState kind="error" message="We couldn't load this report." onRetry={() => void txs.refetch()} />
          ) : !transactions ? (
            <PageState kind="unavailable" message="This report isn't available yet." />
          ) : months.length === 0 ? (
            <PageState
              kind="empty"
              title="Nothing to report yet"
              message="This fills in once you buy credits or give them to practitioners."
            />
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Credits bought, given and used each month, newest first</caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Month</th>
                  <th className="py-2 font-medium">Bought</th>
                  <th className="py-2 font-medium">Given</th>
                  <th className="py-2 font-medium">Used</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.key} className="border-b border-border last:border-b-0">
                    <td className="py-2 text-foreground">{m.label}</td>
                    <td className="py-2 text-foreground">{formatCredits(m.bought)}</td>
                    <td className="py-2 text-foreground">{formatCredits(m.given)}</td>
                    <td className="py-2 text-foreground">{formatCredits(m.used)}</td>
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
