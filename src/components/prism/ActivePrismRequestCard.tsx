/**
 * ActivePrismRequestCard — recovers the questionnaire link for any PRISM
 * survey the user has requested but not yet completed.
 *
 * Why this exists: the link used to be shown exactly once, in the submit
 * success card, and was gone on reload. Both ActionURLs are persisted on the
 * `prism_requests` row and returned by `GET /v1/prism/requests/me`, but no
 * surface rendered them — so a user who closed the tab had no way back to
 * their own survey. (Both dev and staging-b have been sitting on a week-old
 * pending row in exactly that state.)
 *
 * One card per open questionnaire type, since a user may now hold several
 * concurrent surveys (Foundation + Professional).
 */
import { ExternalLink, ClipboardCopy, CheckCircle2, Clock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useActivePrismRequests } from '@/hooks/prism/usePrismRequest'
import { QUEST_TYPE_OPTIONS } from '@/constants/prism'

function questTypeLabel(qtypeId: number | null): string {
  if (qtypeId == null) return 'PRISM questionnaire'
  const match = QUEST_TYPE_OPTIONS.find((o) => o.id === qtypeId)
  return match ? `${match.label} questionnaire` : `Questionnaire type ${qtypeId}`
}

function formatRequested(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString()
}

export default function ActivePrismRequestCard() {
  const { active, isLoading } = useActivePrismRequests()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Render nothing while loading or when there is no open request — this sits
  // above the request form, and an empty placeholder there would be noise.
  if (isLoading || active.length === 0) return null

  function handleCopy(id: string, url: string) {
    navigator.clipboard?.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-3" data-testid="active-prism-requests">
      <h2 className="text-lg font-semibold">Your open PRISM surveys</h2>
      {active.map(({ row, questionnaireUrl }) => {
        const requested = formatRequested(row.requested_at ?? row.created_at)
        return (
          <Card key={row.id} data-testid="active-prism-request">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-amber-500" />
                {questTypeLabel(row.qtype_id)}
                <Badge variant="outline" className="ml-1 font-normal">
                  In progress
                </Badge>
              </CardTitle>
              <CardDescription>
                {requested
                  ? `Requested ${requested}`
                  : 'Requested — not yet completed'}
                {row.email ? ` · ${row.email}` : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {questionnaireUrl ? (
                <>
                  <p className="text-xs text-muted-foreground break-all">
                    {questionnaireUrl}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" asChild>
                      <a
                        href={questionnaireUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Questionnaire
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(row.id, questionnaireUrl)}
                    >
                      {copiedId === row.id ? (
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
                      )}
                      {copiedId === row.id ? 'Copied' : 'Copy link'}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  PRISM has not issued a questionnaire link for this request
                  yet. It will appear here once they do.
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
