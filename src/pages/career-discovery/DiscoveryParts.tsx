import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { WageRange } from "@/types/career-discovery"

/** Page heading used by every Discovery stage. */
export function StageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {lead ? <p className="max-w-3xl text-sm text-muted-foreground">{lead}</p> : null}
    </header>
  )
}

/** A failure, said out loud. Never a blank page. */
export function DiscoveryError({ message }: { message: string }) {
  return (
    <Card role="alert" className="border-destructive/40">
      <CardContent className="p-6 text-sm">{message}</CardContent>
    </Card>
  )
}

export function DiscoveryLoading({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

export function NoticeCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

/** A pay range — never a bare number: always entry, median, experienced, source and year. */
export function PayRange({ range }: { range: WageRange | null }) {
  if (!range) {
    return <p className="text-sm text-muted-foreground">No pay data on file for this area yet.</p>
  }
  return (
    <div className="text-sm">
      <p>
        <span className="text-muted-foreground">Entry</span> {money(range.low)} ·{" "}
        <span className="text-muted-foreground">Median</span> {money(range.median)} ·{" "}
        <span className="text-muted-foreground">Experienced</span> {money(range.high)}
      </p>
      <p className="text-xs text-muted-foreground">
        {range.source}, {range.asOf}
      </p>
    </div>
  )
}
