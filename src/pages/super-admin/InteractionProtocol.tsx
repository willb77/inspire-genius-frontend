import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Save, ScrollText } from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getInteractionProtocol,
  updateInteractionProtocol,
  type InteractionProtocol as ProtocolData,
} from "@/services/agent/protocolService"

export default function InteractionProtocol() {
  const [protocol, setProtocol] = useState<ProtocolData | null>(null)
  const [protocolText, setProtocolText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getInteractionProtocol()
      .then((data) => {
        if (cancelled) return
        setProtocol(data)
        setProtocolText(data.protocol)
      })
      .catch((err) => {
        if (cancelled) return
        const message = err?.response?.data?.detail || err?.message || "Failed to load protocol"
        setError(message)
        toast.error("Failed to load interaction protocol")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateInteractionProtocol(protocolText, protocol?.version)
      setProtocol((prev) =>
        prev
          ? { ...prev, protocol: protocolText, version: result.version, updated_at: new Date().toISOString() }
          : prev,
      )
      toast.success(`Protocol saved (v${result.version})`)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Failed to save protocol"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const tokenEstimate = Math.round(protocolText.length / 4)
  const isDirty = protocol !== null && protocolText !== protocol.protocol

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Interaction Protocol</h1>
          </div>
          <p className="text-muted-foreground">
            The interaction protocol is injected into every agent system prompt. Changes apply to all new conversations.
          </p>
        </div>

        {/* Main Card */}
        {loading ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-40" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-20" />
            </CardFooter>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive font-medium">Failed to load protocol</p>
              <p className="text-muted-foreground mt-1 text-sm">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Protocol Editor</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">v{protocol?.version ?? 1}</Badge>
                  <Badge variant={protocol?.active ? "default" : "destructive"}>
                    {protocol?.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <CardDescription className="flex items-center gap-4">
                {protocol?.updated_at && (
                  <span>
                    Last updated:{" "}
                    {new Date(protocol.updated_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                )}
                <span className="text-muted-foreground">~{tokenEstimate.toLocaleString()} tokens</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Textarea
                value={protocolText}
                onChange={(e) => setProtocolText(e.target.value)}
                rows={16}
                className="font-mono text-sm"
                placeholder="Enter the interaction protocol text..."
              />
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t pt-4">
              <p className="text-muted-foreground text-xs">
                {protocolText.length.toLocaleString()} characters
              </p>
              <Button onClick={handleSave} disabled={saving || !isDirty}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Protocol"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  )
}
