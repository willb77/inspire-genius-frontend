/**
 * "Prism Data" — the HomeV2 header dropdown that replaced the single
 * "View PRISM Report" button (2026-08-07, request).
 *
 * Two items:
 *   1. PRISM Report (PDF) — the *real* PRISM Brain Mapping PDF the candidate
 *      completed, fetched from S3 as a short-lived presigned URL via the
 *      poll-ingest pipeline (`/v1/prism/report/me` → `/report/download`).
 *      Distinct from the docgen "Self-Portrait", which stays on the tile's
 *      Self-Portrait quick action.
 *   2. Brain Map — the productionised radial PRISM wheel (`PrismRadialMap`),
 *      the same map the "Behavioral map" pill opens.
 *
 * The PDF item enables only when a poll-ingested PDF actually exists
 * (`pdf_available`); otherwise it renders disabled with an honest hint rather
 * than a link that 404s.
 *
 * The data-fetching lives in `PrismReportPdfItem`, which Radix mounts only
 * while the menu is open — so the report query never runs just because the
 * page rendered, matching the lazy pattern the "Behavioral map" dialog uses.
 */
import { useState, type JSX } from "react"
import { ChevronDown, Brain, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PrismSelfMapContent } from "@/components/prism/PrismSelfMapContent"
import {
  useMyPrismReport,
  useMyPrismReportDownloadUrl,
} from "@/hooks/prism/usePrismReportDownload"

/**
 * The "PRISM Report (PDF)" menu item + its data. Mounted only inside an open
 * DropdownMenuContent, so `useMyPrismReport` fires when the user opens the menu
 * — not on every HomeV2 render.
 */
function PrismReportPdfItem(): JSX.Element {
  const { data: report, isLoading } = useMyPrismReport()
  const download = useMyPrismReportDownloadUrl()
  // Availability no longer requires a poll-ingest row: the resolver serves the
  // caller's best real PDF (uploaded document or rendered-from-scores) even when
  // request_id is absent — the case that used to read "your PDF isn't ready".
  const pdfReady = Boolean(report?.pdf_available)

  const openPdf = (): void => {
    if (!pdfReady) return
    // Open the tab synchronously inside the click gesture, then redirect it to
    // the presigned URL once it resolves — otherwise the async hop trips the
    // popup blocker and the report silently never appears.
    //
    // Features are omitted DELIBERATELY. Passing "noopener" (or "noreferrer",
    // which implies it) makes window.open return **null** by spec — verified in
    // Chrome 150 inside a real user gesture — so there is no handle to redirect
    // and the code below falls through to navigating the CURRENT tab, replacing
    // Home with the PDF. That was the bug: the tab was never opened at all.
    // Severing `opener` by assignment gives the same protection as the flag
    // while keeping the handle.
    const win = window.open("", "_blank")
    if (win) win.opener = null
    download
      .mutateAsync({ kind: "pdf" })
      .then(({ url }) => {
        if (win) {
          win.location.href = url
        } else {
          // Only reachable if the browser blocked the popup outright. Navigating
          // the current tab would lose Home — the very thing being fixed — so
          // offer the link instead. Clicking the toast action is itself a user
          // gesture, so opening with the URL up front is not blocked.
          toast.error("Your browser blocked the report window.", {
            action: {
              label: "Open report",
              onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
            },
          })
        }
      })
      .catch(() => {
        win?.close()
        toast.error("Couldn't open your PRISM report. Please try again.")
      })
  }

  return (
    <>
      <DropdownMenuItem
        data-testid="homev2-prism-data-pdf"
        disabled={!pdfReady || download.isPending}
        onSelect={(e) => {
          // Suppress the menu's auto-close so the async open can run first.
          e.preventDefault()
          openPdf()
        }}
      >
        {download.isPending || isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileText className="size-4" aria-hidden="true" />
        )}
        <span>PRISM Report (PDF)</span>
      </DropdownMenuItem>
      {!isLoading && !pdfReady ? (
        <p className="px-2 pb-1.5 pt-0.5 text-[11px] text-muted-foreground">
          Your PDF isn't ready yet.
        </p>
      ) : null}
    </>
  )
}

export function PrismDataMenu(): JSX.Element {
  const [mapOpen, setMapOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-testid="homev2-prism-data"
            className="w-full border-[rgba(11,27,51,0.10)] text-[#0B1B33] sm:w-auto"
          >
            <FileText className="size-4" />
            Prism Data
            <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          <PrismReportPdfItem />
          <DropdownMenuItem
            data-testid="homev2-prism-data-map"
            onSelect={() => setMapOpen(true)}
          >
            <Brain className="size-4" aria-hidden="true" />
            <span>Brain Map</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Your PRISM Brain Map</DialogTitle>
            <DialogDescription>
              Your PRISM 8-dimension profile plotted on the behavioral map.
            </DialogDescription>
          </DialogHeader>
          {mapOpen ? <PrismSelfMapContent /> : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PrismDataMenu
