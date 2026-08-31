import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Download, FileLock2, Loader2 } from "lucide-react"
import { getToken } from "@/lib/storage"

/**
 * Durable-link broker for confidential assets.
 *
 * A permanent link (`https://assets-<env>.inspiresgenius.com/d/<id>`) redirects
 * here. The link itself carries no credential — that is the whole point, since
 * a presigned URL authenticates whoever holds it and therefore has to expire.
 * Instead the authorization check runs *here*, fresh, on every single open:
 * this page holds the session, exchanges the opaque id for a 60-second download
 * URL, and hands the browser straight to it.
 *
 * Consequences worth keeping: the link is instantly revocable (drop the
 * person's super-admin role and the next open fails), and every open is logged
 * server-side with who did it.
 *
 * This page is deliberately NOT under a role-gated route prefix. A manager who
 * is sent one of these links must land on a clear "you don't have access"
 * message; bouncing them to their own dashboard would look like a broken link
 * and generate a support ticket instead of an explanation.
 */
export const ASSET_LIBRARY_API =
  import.meta.env.VITE_ASSET_LIBRARY_API ?? "https://assets-dev.inspiresgenius.com"

/**
 * The single point where this page hands control to the browser and leaves the
 * app. Exported as an object so tests can spy on it: jsdom's `window.location`
 * is non-configurable, so it cannot be mocked directly.
 */
export const navigation = {
  go(url: string) {
    window.location.replace(url)
  },
}

type State =
  | { kind: "resolving" }
  | { kind: "ready"; url: string; name: string }
  | { kind: "denied" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "no-session" }

export default function AssetOpen() {
  const [params] = useSearchParams()
  const id = params.get("id") ?? ""
  const [state, setState] = useState<State>({ kind: "resolving" })
  // Guards against StrictMode's double-effect firing two resolves — harmless
  // but it would double the audit-log entries for a single human open.
  const started = useRef(false)

  const resolve = useCallback(async () => {
    if (!id) {
      setState({ kind: "error", message: "This link is missing its document id." })
      return
    }
    setState({ kind: "resolving" })

    // The access token MUST be read with getToken() from @/lib/storage — the same
    // accessor the axios interceptor uses. There are two encrypted-storage modules
    // in this app with INCOMPATIBLE payload formats: storage.ts (encryptString, raw
    // payload) writes the token, and secureStorage.ts (AES-GCM + a {iv,data,v} JSON
    // envelope) is a different scheme. Reading the token with secureGetItem parses
    // the other module's payload, throws, and silently returns null — which is
    // exactly how this shipped broken: the launcher rendered a link with no token,
    // the tool never received one, and the confidential checkbox stayed disabled
    // with nothing logged anywhere.
    const token = await getToken()
    if (!token) {
      setState({ kind: "no-session" })
      return
    }

    try {
      const res = await fetch(`${ASSET_LIBRARY_API}/d/${encodeURIComponent(id)}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ig-token": token },
      })
      const body = await res.json().catch(() => ({}))

      if (res.status === 403) return setState({ kind: "denied" })
      if (res.status === 404) return setState({ kind: "missing" })
      if (!res.ok || !body.ok) {
        return setState({ kind: "error", message: body.error || `Request failed (${res.status})` })
      }
      setState({ kind: "ready", url: body.url, name: body.name })
      // Straight to the download. The URL lives 60 seconds and is never shown.
      navigation.go(body.url)
    } catch {
      setState({
        kind: "error",
        message: "Could not reach the asset service. Check your connection and try again.",
      })
    }
  }, [id])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void resolve()
  }, [resolve])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-4 text-center">
          {state.kind === "resolving" && (
            <>
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Checking your access…</p>
            </>
          )}

          {state.kind === "ready" && (
            <>
              <Download className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-medium">Your download is starting</p>
              <p className="text-sm text-muted-foreground break-all">{state.name}</p>
              {/* The redirect above normally takes over. This is the fallback
                  for browsers that block a programmatic navigation. */}
              <Button asChild variant="outline" size="sm">
                <a href={state.url}>Download didn&apos;t start? Click here</a>
              </Button>
            </>
          )}

          {state.kind === "denied" && (
            <>
              <FileLock2 className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-medium">This document is restricted</p>
              <p className="text-sm text-muted-foreground">
                Confidential documents are available to InspiresGenius super admins only.
                Your account doesn&apos;t have that access.
              </p>
            </>
          )}

          {state.kind === "missing" && (
            <>
              <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-medium">This document is no longer available</p>
              <p className="text-sm text-muted-foreground">
                It may have been removed from the library. The link itself is fine — there is
                nothing behind it any more.
              </p>
            </>
          )}

          {state.kind === "no-session" && (
            <>
              <FileLock2 className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-medium">Sign in to open this document</p>
              <p className="text-sm text-muted-foreground">
                You need an active InspiresGenius session. Sign in, then open the link again.
              </p>
              <Button asChild size="sm">
                <a href={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                  Sign in
                </a>
              </Button>
            </>
          )}

          {state.kind === "error" && (
            <>
              <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-medium">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <Button variant="outline" size="sm" onClick={() => void resolve()}>
                Try again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
