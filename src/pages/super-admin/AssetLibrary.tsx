import { useEffect, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, FolderOpen, Lock, Search, Share2, ShieldCheck } from "lucide-react"
import { getToken } from "@/lib/storage"

/**
 * Where the tool is hosted, per tier. On dev it sits in the public demo bucket;
 * on staging-b that account has no public buckets at all (everything is
 * block-all-public behind CloudFront OAC), so it is served through the existing
 * admin-tools distribution. Hard-coding dev's URL would have sent staging-b
 * super admins to dev's library, where their token is rejected — each tier's
 * Asset Library verifies against its OWN platform.
 */
export const ASSET_LIBRARY_URL =
  import.meta.env.VITE_ASSET_LIBRARY_TOOL_URL ??
  "https://ig-demo-public-videos.s3.amazonaws.com/library/index.html"

export const ASSET_LIBRARY_API =
  import.meta.env.VITE_ASSET_LIBRARY_API ?? "https://assets-dev.inspiresgenius.com"

/**
 * Asset Library launcher.
 *
 * The library itself is a standalone tool hosted at a durable URL, not a React
 * route — that is what lets a link to it keep working outside the app. This
 * page exists to do the one thing the standalone tool cannot do for itself:
 * prove the person opening it is an IG super-admin, which unlocks the
 * confidential tier.
 *
 * The handoff puts the access token in the URL **fragment**. A fragment is
 * never transmitted to the server, so it stays out of S3 and CloudFront access
 * logs — unlike a query string, which would be recorded in both. The tool
 * strips it from its address bar on load.
 */
export default function AssetLibrary() {
  const [token, setToken] = useState<string | null>(null)
  // Whether THIS tier has a public tier at all. staging-b does not, so the copy
  // below must not promise permanent shareable links that cannot exist there —
  // that is how a UI teaches people something untrue about their own data.
  // null = not yet known; the copy stays neutral until it is.
  const [hasPublicTier, setHasPublicTier] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    // The access token MUST be read with getToken() from @/lib/storage — the same
    // accessor the axios interceptor uses. There are two encrypted-storage modules
    // in this app with INCOMPATIBLE payload formats: storage.ts (encryptString, raw
    // payload) writes the token, and secureStorage.ts (AES-GCM + a {iv,data,v} JSON
    // envelope) is a different scheme. Reading the token with secureGetItem parses
    // the other module's payload, throws, and silently returns null — which is
    // exactly how this shipped broken: the launcher rendered a link with no token,
    // the tool never received one, and the confidential checkbox stayed disabled
    // with nothing logged anywhere.
    getToken().then((value) => {
      if (!cancelled) setToken(value ?? null)
    })
    // /health is unauthenticated and cheap; it also proves the endpoint this
    // build points at is actually reachable from this tier.
    fetch(`${ASSET_LIBRARY_API}/health`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setHasPublicTier(!!j?.publicTier)
      })
      .catch(() => {
        if (!cancelled) setHasPublicTier(null)
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
            {hasPublicTier !== false && (
              <li className="flex gap-3">
                <Share2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>
                  Public assets get a <strong>permanent</strong> link to view or download —
                  safe to send to anyone.
                </span>
              </li>
            )}
            <li className="flex gap-3">
              <Lock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>
                Files marked <strong>confidential</strong> are stored in a separate private
                bucket and are visible, searchable and shareable only to verified IG super
                admins. Their links are permanent but carry no credential — every open
                re-checks your access, so a forwarded link is useless to anyone else.
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
            {hasPublicTier === false
              ? "This environment has no public tier — the library is confidential-only here."
              : "Opened directly, it asks for the shared passcode and shows public assets only."}
          </p>
        </CardContent>
      </Card>
    </SuperAdminLayout>
  )
}
