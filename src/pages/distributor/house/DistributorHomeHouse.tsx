import { Link } from "react-router-dom"
import DistributorLayout from "@/layouts/DistributorLayout"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { formatDate } from "@/lib/house/formatDate"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import {
  useDistributorCredits,
  useDistributorPractitioners,
  useDistributorTransactions,
} from "@/hooks/distributor/useDistributor"
import { ValidationReviewQueue } from "@/components/job-blueprint/validation/ValidationReviewQueue"
import {
  DASH,
  firstNameOf,
  formatCredits,
  greetingFor,
  readCredits,
  readPractitioners,
  readTransactions,
  transactionLabel,
} from "./distributorData"
import { Section, StatTile } from "./parts"

const PREVIEW_ROWS = 5

/**
 * Distributor home, house style (switch: `distributor`).
 *
 * Real figures or a dash — never the sample totals, sample practitioners or
 * fixed company name the classic page falls back to. Greets the account by
 * its own name.
 */
export default function DistributorHomeHouse() {
  const { user } = useAuth()
  const practs = useDistributorPractitioners()
  const credits = useDistributorCredits()
  const txs = useDistributorTransactions()

  const name = firstNameOf(user)
  const greeting = greetingFor(new Date().getHours())
  const title = name ? `${greeting}, ${name}` : greeting

  const creditFigures = credits.error ? null : readCredits(credits.data)
  const practitioners = practs.error ? null : readPractitioners(practs.data)
  const transactions = txs.error ? null : readTransactions(txs.data)

  return (
    <DistributorLayout>
      <PageHeader title={title} description="Your practitioners and PRISM credits at a glance." />

      {/* The reviewer's queue; renders nothing unless a validation request names this distributor. */}
      <ValidationReviewQueue />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Credits available"
          value={formatCredits(creditFigures?.available)}
          loading={credits.isLoading}
        />
        <StatTile
          label="Given to practitioners"
          value={formatCredits(creditFigures?.given)}
          loading={credits.isLoading}
        />
        <StatTile
          label="Practitioners"
          value={practitioners ? String(practitioners.length) : DASH}
          loading={practs.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title="Your practitioners"
          action={
            <Link to={ROUTES.DISTRIBUTOR.NETWORK} className="text-sm text-primary hover:underline">
              See all
            </Link>
          }
        >
          {practs.isLoading ? (
            <PageState kind="loading" rows={3} />
          ) : practs.error ? (
            <PageState
              kind="error"
              message="We couldn't load your practitioners."
              onRetry={() => void practs.refetch()}
            />
          ) : !practitioners ? (
            <PageState kind="unavailable" message="Your practitioner list isn't available yet." />
          ) : practitioners.length === 0 ? (
            <PageState
              kind="empty"
              title="No practitioners yet"
              message="When practitioners join your network, they'll appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {practitioners.slice(0, PREVIEW_ROWS).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-foreground">{p.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatCredits(p.used)} of {formatCredits(p.given)} credits used
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Recent credit activity"
          action={
            <Link to={ROUTES.DISTRIBUTOR.CREDITS} className="text-sm text-primary hover:underline">
              Credits
            </Link>
          }
        >
          {txs.isLoading ? (
            <PageState kind="loading" rows={3} />
          ) : txs.error ? (
            <PageState
              kind="error"
              message="We couldn't load your credit activity."
              onRetry={() => void txs.refetch()}
            />
          ) : !transactions ? (
            <PageState kind="unavailable" message="Credit activity isn't available yet." />
          ) : transactions.length === 0 ? (
            <PageState
              kind="empty"
              title="No credit activity yet"
              message="Credits you buy or give to practitioners will be listed here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {transactions.slice(0, PREVIEW_ROWS).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="w-28 shrink-0 text-muted-foreground">{formatDate(t.createdAt)}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{transactionLabel(t.type)}</span>
                  <span className="shrink-0 font-medium text-foreground">{formatCredits(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </DistributorLayout>
  )
}
