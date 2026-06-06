import { useEffect, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { agentApi } from "@/lib/agentApi"

/**
 * Super-admin Dev Traffic Report page.
 *
 * The backend at GET /v1/super-admin/dev-traffic-report renders the
 * full HTML report server-side. We fetch it through the authenticated
 * agentApi (so the access-token header gets attached) and sandbox the
 * markup inside an iframe so its inline styles don't bleed into the
 * surrounding app shell.
 *
 * Access is restricted server-side to the platform owner email
 * (currently willb77@3pp.com). Non-owners see the same forbidden
 * payload either way, but we hide the nav link upstream where we can.
 */
export default function DevTrafficReport() {
  const [hours, setHours] = useState(24)
  const [includeContent, setIncludeContent] = useState(false)
  const [html, setHtml] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchReport = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const resp = await agentApi.get<string>("/v1/super-admin/dev-traffic-report", {
        params: { hours, include_content: includeContent ? "true" : "false" },
        responseType: "text",
        transformResponse: [(data: string) => data],
      })
      setHtml(resp.data)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string }
      if (err.response?.status === 403) {
        setError("This report is restricted to the platform owner.")
      } else {
        setError(err.message ?? "Failed to fetch report")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dev Traffic Report</h1>
          <div className="text-xs text-slate-500">
            Source: <code>agent-engine /v1/super-admin/dev-traffic-report</code>
          </div>
        </header>

        <div className="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-md p-3">
          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-500">
            Window (hours)
            <input
              type="number"
              min={1}
              max={24 * 14}
              value={hours}
              onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 24))}
              className="mt-1 px-2 py-1 border border-slate-300 rounded w-32 text-sm text-slate-900"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeContent}
              onChange={(e) => setIncludeContent(e.target.checked)}
            />
            Include message content
          </label>
          <button
            type="button"
            onClick={() => void fetchReport()}
            disabled={isLoading}
            className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-sm font-medium rounded"
          >
            {isLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="border border-red-200 bg-red-50 text-red-800 text-sm rounded-md p-4">
            {error}
          </div>
        ) : (
          <iframe
            title="Dev Traffic Report"
            srcDoc={html}
            sandbox="allow-same-origin"
            className="w-full bg-white border border-slate-200 rounded-md"
            style={{ height: "calc(100vh - 220px)", minHeight: 600 }}
          />
        )}
      </div>
    </SuperAdminLayout>
  )
}
