import { Wallet, Coins, TrendingUp, Users } from "lucide-react"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatCard from "@/components/dashboard/StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCoachCredits, useClientUsage } from "@/hooks/practitioner/useCoachClient"
import type { CreditsSummary, ClientUsageRow } from "@/types/practitioner/coachClient"
import type { StatCardData } from "@/types/dashboard/data-types"

function nf(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

function utilization(credits: CreditsSummary): number {
  if (credits.allocated <= 0) return 0
  return Math.round((credits.used / credits.allocated) * 100)
}

function creditTiles(credits: CreditsSummary): StatCardData[] {
  return [
    {
      label: `Balance (${credits.currency})`,
      value: nf(credits.balance),
      icon: Wallet,
      iconColor: "text-[#3B5BFF]",
      iconBg: "bg-[#EEF1FF]",
    },
    {
      label: `Allocated (${credits.currency})`,
      value: nf(credits.allocated),
      icon: Coins,
      iconColor: "text-[#127A8A]",
      iconBg: "bg-[#E6F2F4]",
    },
    {
      label: `Used (${credits.currency})`,
      value: nf(credits.used),
      icon: Users,
      iconColor: "text-[#C88B1B]",
      iconBg: "bg-[#FBF2E1]",
    },
    {
      label: "Utilization",
      value: `${utilization(credits)}%`,
      icon: TrendingUp,
      iconColor: "text-[#10B981]",
      iconBg: "bg-[#E7F7F0]",
    },
  ]
}

function CreditsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[132px] w-full" />
      ))}
    </div>
  )
}

function PukCreditsSection() {
  const { data: credits, isLoading, error, refetch } = useCoachCredits()

  return (
    <DataCard title="PUK Credits">
      {isLoading && <CreditsSkeleton />}

      {!isLoading && error && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
          Failed to load credit balance.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && credits && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {creditTiles(credits).map((tile) => (
              <StatCard key={tile.label} {...tile} />
            ))}
          </div>
          <p className="text-[12px] text-[#6b7280] mt-3.5">
            Credit allocation and top-ups are managed by your distributor.
          </p>
        </>
      )}
    </DataCard>
  )
}

function UsageSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

function ClientUseSection() {
  const { data: usage, isLoading, error, refetch } = useClientUsage()

  const rows: ClientUsageRow[] = usage ?? []

  return (
    <DataCard title="Client use">
      {isLoading && <UsageSkeleton />}

      {!isLoading && error && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
          Failed to load client usage.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <p className="text-[13px] text-[#6b7280] py-6 text-center">
          No client usage recorded yet.
        </p>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[#6b7280]">Client</TableHead>
              <TableHead className="text-[#6b7280] text-right">Sessions</TableHead>
              <TableHead className="text-[#6b7280] text-right">Credits Used</TableHead>
              <TableHead className="text-[#6b7280]">Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.clientName}>
                <TableCell className="font-medium text-[#111827]">{row.clientName}</TableCell>
                <TableCell className="text-right text-[#374151]">{nf(row.sessions)}</TableCell>
                <TableCell className="text-right text-[#374151]">{nf(row.creditsUsed)}</TableCell>
                <TableCell className="text-[#6b7280]">{row.lastActive}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataCard>
  )
}

export default function PractitionerAnalytics() {
  return (
    <PractitionerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-1">
        PUK credit balance and per-client usage.
      </p>

      <PukCreditsSection />
      <ClientUseSection />
    </PractitionerLayout>
  )
}
