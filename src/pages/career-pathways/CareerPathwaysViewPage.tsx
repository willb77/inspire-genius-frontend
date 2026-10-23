import { useState } from "react"
import { useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ProfileView } from "@/components/career-pathways/ProfileView"
import { useDownloadShared, useOpenShared, useRequestCode } from "@/hooks/career-pathways/useCareerPathways"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import type { FileFormat } from "@/types/careerPathways"

/**
 * N-8 — the recipient's view of a shared Career Pathways Profile. Public (no
 * sign-in), like /terms. The link token is in the URL FRAGMENT, which browsers
 * never send to a server, so it reaches no access log. A token alone opens
 * nothing: a code is mailed to the address the candidate chose, at the moment
 * of opening. Every refusal of the link reads the same.
 */

const GONE = "This link is not available. It may have expired, been withdrawn, or reached its open limit."

function tokenFrom(hash: string): string {
  return hash.startsWith("#") ? hash.slice(1) : hash
}

function isNotFound(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 404
}

export default function CareerPathwaysViewPage() {
  const { hash } = useLocation()
  const token = tokenFrom(hash)
  const requestCode = useRequestCode()
  const open = useOpenShared()
  const download = useDownloadShared()
  const [code, setCode] = useState("")

  const save = (format: FileFormat) => {
    const viewKey = open.data?.viewKey
    if (!viewKey) return
    download.mutate(
      { token, viewKey, format },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `career-pathways-profile.${format}`
          a.click()
          URL.revokeObjectURL(url)
        },
      },
    )
  }

  const failure = requestCode.error ?? open.error
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold text-[#1f2937]">Career Pathways Profile</h1>
      <p className="mb-4 text-sm text-[#6b7280]">Shared with you through Inspires Genius by the candidate.</p>

      {!token ? (
        <p role="alert" className="text-sm text-red-700">
          {GONE}
        </p>
      ) : open.data ? (
        <>
          <p className="mb-3 text-xs text-[#6b7280]">
            Shared with {open.data.organisation} until {open.data.expiresAt.slice(0, 10)}. The candidate can see each
            time this is opened and can withdraw it.
          </p>
          <ProfileView content={open.data.profile} />
          {open.data.allowDownload && open.data.viewKey && (
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => save("pdf")} disabled={download.isPending}>
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => save("docx")} disabled={download.isPending}>
                Download Word
              </Button>
            </div>
          )}
          {download.isError && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {isNotFound(download.error) ? GONE : apiErrorMessage(download.error, "The download did not work.")}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[#374151]">
            To open it, we will email a code to the address this profile was shared with.
          </p>
          <Button onClick={() => requestCode.mutate(token)} disabled={requestCode.isPending}>
            {requestCode.isSuccess ? "Send another code" : "Send me a code"}
          </Button>
          {requestCode.isSuccess && (
            <div className="flex items-center gap-2">
              <label className="text-sm">
                Code
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="ml-2 w-28 rounded border border-[#e5e7eb] p-1.5"
                />
              </label>
              <Button onClick={() => open.mutate({ token, code })} disabled={code.length !== 6 || open.isPending}>
                Open
              </Button>
            </div>
          )}
          {failure && (
            <p role="alert" className="text-sm text-red-700">
              {isNotFound(failure) ? GONE : apiErrorMessage(failure, "That did not work. Try again.")}
            </p>
          )}
        </div>
      )}
    </main>
  )
}
