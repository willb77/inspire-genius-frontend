import { useRef, useState } from "react"
import { CheckCircle2, Plus, Upload, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useUploadClientResource } from "@/hooks/practitioner/useCoachClient"
import { CLIENT_RESOURCES, type ResourceKey } from "@/types/practitioner/coachClient"

export type ArtifactStatusMatrixProps = {
  resources: Record<ResourceKey, boolean>
  clientId: string
}

/**
 * Resource-presence matrix for a coach client.
 *
 * One labelled row per canonical resource (10). Present resources show a green
 * "On file" check; absent ones expose an "Add" affordance that reveals an inline
 * file input (assessment/document kinds) or a textarea (text kind, i.e. goals)
 * and uploads via useUploadClientResource.
 */
export function ArtifactStatusMatrix({ resources, clientId }: ArtifactStatusMatrixProps) {
  const upload = useUploadClientResource()
  const [openKey, setOpenKey] = useState<ResourceKey | null>(null)
  const [text, setText] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setOpenKey(null)
    setText("")
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleSave(key: ResourceKey, kind: "assessment" | "document" | "text") {
    const file = kind === "text" ? undefined : fileRef.current?.files?.[0]
    if (kind !== "text" && !file) {
      toast.error("Choose a file to upload.")
      return
    }
    if (kind === "text" && !text.trim()) {
      toast.error("Enter some text to save.")
      return
    }
    upload.mutate(
      { clientId, resource: key, file },
      {
        onSuccess: () => {
          const label = CLIENT_RESOURCES.find((r) => r.key === key)?.label ?? key
          toast.success(`${label} added to client file.`)
          reset()
        },
      },
    )
  }

  return (
    <div className="divide-y divide-[#e5e7eb]">
      {CLIENT_RESOURCES.map((res) => {
        const present = resources[res.key]
        const isOpen = openKey === res.key
        const isPending = upload.isPending && openKey === res.key
        return (
          <div key={res.key} className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {present ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#059669]" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-[#d1d5db]" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#111827] truncate">{res.label}</div>
                  <div className="text-[11px] uppercase tracking-wide text-[#9ca3af]">{res.kind}</div>
                </div>
              </div>
              {present ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-xs font-medium text-[#065F46]">
                  <CheckCircle2 className="h-3 w-3" />
                  On file
                </span>
              ) : isOpen ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[#6b7280]"
                  onClick={reset}
                  aria-label={`Cancel adding ${res.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-[#e5e7eb] text-[#3B5BFF] hover:bg-[#eef1ff] hover:text-[#2A47CC]"
                  onClick={() => {
                    setOpenKey(res.key)
                    setText("")
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>

            {isOpen && !present && (
              <div className="mt-2.5 space-y-2 rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-3">
                {res.kind === "text" ? (
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Enter ${res.label.toLowerCase()}…`}
                    rows={3}
                    className="bg-white"
                  />
                ) : (
                  <input
                    ref={fileRef}
                    type="file"
                    aria-label={`${res.label} file`}
                    className="block w-full text-sm text-[#6b7280] file:mr-3 file:rounded file:border-0 file:bg-[#3B5BFF] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#2A47CC]"
                  />
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 bg-[#3B5BFF] text-white hover:bg-[#2A47CC]"
                    disabled={isPending}
                    onClick={() => handleSave(res.key, res.kind)}
                  >
                    {isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {res.kind === "text" ? "Save" : "Upload"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ArtifactStatusMatrix
