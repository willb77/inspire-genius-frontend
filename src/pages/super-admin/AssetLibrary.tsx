import { useEffect, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, FolderOpen, Lock, Search, Share2, ShieldCheck } from "lucide-react"
import { secureGetItem } from "@/lib/secureStorage"
import { STORAGE_KEYS } from "@/constants/routes"

/**
 * Asset Library launcher.
 *
 * The library itself is a standalone tool hosted on S3 at a durable URL, not a
 * React route — that is what lets a link to it keep working outside the app.
 * This page exists to do the one thing the standalone tool cannot do for
 * itself: prove the person opening it is an IG super-admin, which unlocks the
 * confidential tier.
 *
 * The handoff puts the access token in the URL **fragment**. A fragment is
 * never transmitted to the server, so it stays out of S3 and CloudFront access
 * logs — unlike a query string, which would be recorded in both. The tool
 * strips it from its address bar on load.
 */
export const ASSET_LIBRARY_URL =
  "https://ig-demo-public-videos.s3.amazonaws.com/library/index.html"

export default function AssetLibrary() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    secureGetItem<string>(STORAGE_KEYS.USER_TOKEN).then((value) => {
      if (!cancelled) setToken(value ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const href = token
    ? `${ASSET_LIBRARY_URL}#igt=${encodeURIComponent(token)}`
    : ASSET_LIBRARY_URL

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Asset Library</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add, search and share documents, files and videos — with durable links for public
          assets and a private tier for confidential ones.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Open the Asset Library
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Search className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>
                Search every asset by name, title, description or tag, filtered by type.
              </span>
            </li>
            <li className="flex gap-3">
              <Share2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>
                Public assets get a <strong>permanent</strong> link to view or download —
                safe to send to anyone.
              </span>
            </li>
            <li className="flex gap-3">
              <Lock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>
                Files marked <strong>confidential</strong> are stored in a separate private
                bucket, never get a public link, and are visible, searchable and shareable
                only to verified IG super admins. Their share links expire after 15 minutes.
              </span>
            </li>
          </ul>

          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                {token ? (
                  <>
                    <span className="font-medium">Confidential access will be unlocked.</span>{" "}
                    Opening from here verifies your super-admin session with the platform.
                  </>
                ) : (
                  <>
                    <span className="font-medium">Confidential access will stay locked.</span>{" "}
                    No active session token was found — sign in again, or the library will
                    open with public assets only.
                  </>
                )}
              </div>
            </div>
          </div>

          {/*
            A plain anchor, not window.open(). `window.open(url, "_blank", "noopener")`
            returns null and, in several browsers, navigates the CURRENT tab instead —
            a failure mocks in tests do not reproduce.
          */}
          <Button asChild size="lg">
            <a href={href} target="_blank" rel="noopener noreferrer">
              Open Asset Library
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>

          <p className="text-xs text-muted-foreground">
            Durable link:{" "}
            <code className="break-all">{ASSET_LIBRARY_URL}</code>
            <br />
            Opened directly, it asks for the shared passcode and shows public assets only.
          </p>
        </CardContent>
      </Card>
    </SuperAdminLayout>
  )
}
