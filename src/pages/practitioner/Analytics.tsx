import { Users } from "lucide-react"
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
import type { ClientUsageRow } from "@/types/practitioner/coachClient"

function nf(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

function CountSkeleton() {
  return <Skeleton className="h-[132px] w-full max-w-[280px]" />
}

/**
 * Clients under management (X-2). There is no practitioner credit balance —
 * a PRISM survey is billed to the practitioner's own PRISM site — so this
 * section reports the one live fact: activated clients on a live link.
 * Zero is a real zero; a missing count reads as unavailable, never as zero.
 */
function ClientsUnderManagementSection() {
  const { data, isLoading, error, refetch } = useCoachCredits()
  const count = data?.clientsUnderManagement ?? null

  return (
    <DataCard title="Clients under management">
      {isLoading && <CountSkeleton />}

      {!isLoading && error && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
          Failed to load clients under management.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              label="Clients under management"
              value={count === null ? "—" : nf(count)}
              icon={Users}
              iconColor="text-[#127A8A]"
              iconBg="bg-[#E6F2F4]"
            />
          </div>
          <p className="text-[12px] text-[#6b7280] mt-3.5">
            {count === null
              ? "The count is not available right now."
              : "Clients who have activated their account and are linked to you."}
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
        Clients under management and per-client usage.
      </p>

      <ClientsUnderManagementSection />
      <ClientUseSection />
    </PractitionerLayout>
  )
}
