import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

/**
 * Replaces the embedded project-log iframe.
 *
 * The log used to be served from `public/IG_project_log.html`, which ships
 * verbatim into the Vite build and onto CloudFront — so the file itself had no
 * auth in front of it even though this page does. It is no longer published to
 * this repo; the full log lives in the private monorepo.
 */
export default function ProjectLogMoved() {
  return (
    <Card className="flex-1">
      <CardContent className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
        <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-base font-semibold">The project log is no longer published here</h2>
        <p className="text-muted-foreground text-sm max-w-prose">
          It is kept in the private monorepo as <code>IG_project_log.html</code> and{" "}
          <code>change_log.md</code>, and is no longer mirrored into this repository.
        </p>
        <p className="text-muted-foreground text-sm max-w-prose">
          This page is behind a super-admin route, but the log was a static asset served
          straight from the CDN, so it was readable by anyone with the URL.
        </p>
      </CardContent>
    </Card>
  )
}
