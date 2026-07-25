import { AlertTriangle, Handshake, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useSelfPortrait } from "@/hooks/lumen/useSelfPortrait"
import type { PrismQuadrant, PrismQuadrantScores } from "@/types/lumen"

/**
 * "My Self-Portrait" — one coherent behavioral read across every instrument.
 *
 * PRISM leads visually because it leads substantively: it is the anchor the
 * backend reconciles everything else against. Corroborating instruments are
 * ordered most-trustworthy first, and tensions are shown rather than smoothed
 * over — a disagreement between instruments is usually the interesting part.
 */

const QUADRANT_CLASS: Record<PrismQuadrant, string> = {
  Green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Blue: "bg-blue-100 text-blue-800 border-blue-200",
  Red: "bg-red-100 text-red-800 border-red-200",
  Gold: "bg-amber-100 text-amber-800 border-amber-200",
}

// Order matches the licensed manual's quadrant order, not the frontend's older
// BEHAVIOUR_CONFIG colouring (which rotates six of the eight dimensions).
const QUADRANT_ROWS: { key: keyof PrismQuadrantScores; label: PrismQuadrant }[] = [
  { key: "green", label: "Green" },
  { key: "blue", label: "Blue" },
  { key: "red", label: "Red" },
  { key: "gold", label: "Gold" },
]

function PortraitSkeleton() {
  return (
    <div className="space-y-4" data-testid="portrait-loading">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function NoPrismState({ headline }: { headline: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your portrait isn't ready yet</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{headline}</CardContent>
    </Card>
  )
}

export default function SelfPortrait() {
  const { data: portrait, isLoading, isError } = useSelfPortrait()

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PortraitSkeleton />
      </div>
    )
  }

  if (isError || !portrait) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">We couldn't load your portrait</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Something went wrong composing your Self-Portrait. Try again in a moment.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">My Self-Portrait</h1>
        <p className="max-w-3xl text-muted-foreground">{portrait.headline}</p>
        <div className="flex flex-wrap items-center gap-2">
          {portrait.confidence && (
            <Badge variant="outline">Confidence: {portrait.confidence}</Badge>
          )}
          {portrait.instruments.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      </header>

      {!portrait.prism ? (
        <NoPrismState headline={portrait.headline} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              PRISM
              <Badge className={QUADRANT_CLASS[portrait.prism.dominant_quadrant]}>
                {portrait.prism.dominant_quadrant} leads
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {QUADRANT_ROWS.map(({ key, label }) => {
              const value = portrait.prism?.quadrants[key as "green"]
              if (value === undefined) return null
              return (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-muted-foreground">{Math.round(value)}</span>
                  </div>
                  <Progress value={value} />
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {portrait.corroborating.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Corroborating instruments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {portrait.corroborating.map((instrument) => (
              <div
                key={instrument.framework}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{instrument.framework}</span>
                  <Badge className={QUADRANT_CLASS[instrument.maps_to]}>
                    {instrument.maps_to}
                  </Badge>
                  {instrument.agrees_with_prism ? (
                    <Badge variant="outline">agrees</Badge>
                  ) : (
                    <Badge variant="outline">differs</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  confidence {instrument.confidence.toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Handshake className="h-5 w-5 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">Where your instruments agree</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {portrait.convergences.length === 0 ? (
              <p>Nothing to corroborate yet — a second instrument would give us this.</p>
            ) : (
              portrait.convergences.map((line) => <p key={line}>{line}</p>)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">Where they pull apart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {portrait.tensions.length === 0 ? (
              <p>No tensions surfaced. Your instruments tell a consistent story.</p>
            ) : (
              portrait.tensions.map((line) => <p key={line}>{line}</p>)
            )}
          </CardContent>
        </Card>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        PRISM is the anchor — where another instrument disagrees, PRISM leads and the
        difference is shown rather than resolved away.
      </p>
    </div>
  )
}
