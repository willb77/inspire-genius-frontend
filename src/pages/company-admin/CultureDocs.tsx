import { useState, useRef } from "react"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCultureDocs, useUploadCultureDoc, useDeleteCultureDoc } from "@/hooks/culture/useCultureDocs"
import { Upload, Trash2, FileText, BookHeart, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function CultureDocs() {
  const { data, isLoading, error, refetch } = useCultureDocs()
  const uploadMutation = useUploadCultureDoc()
  const deleteMutation = useDeleteCultureDoc()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const docs = data?.documents ?? []

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
    ]
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type. Please upload PDF, DOCX, TXT, or CSV files.")
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.")
      return
    }

    setUploadProgress(0)
    try {
      await uploadMutation.mutateAsync({
        file,
        onProgress: (pct) => setUploadProgress(pct),
      })
      toast.success(`"${file.name}" uploaded successfully.`)
    } catch {
      toast.error("Failed to upload culture document.")
    } finally {
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      await deleteMutation.mutateAsync(docId)
      toast.success("Culture document deleted.")
    } catch {
      toast.error("Failed to delete document.")
    } finally {
      setDeleteConfirmId(null)
    }
  }

  return (
    <CompanyAdminLayout>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-[#111827]">Culture Documents</h1>
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="gap-1.5"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.csv"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <p className="text-[13px] text-[#6b7280] mb-5">
        Upload documents describing your organization&apos;s culture, values, and communication
        guidelines. These are used to personalize AI coaching responses for your team.
      </p>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-[#3B5BFF]/10 to-[#2DD4BF]/10 border border-[#3B5BFF]/20 rounded-lg p-4 mb-5">
        <div className="flex items-center gap-2">
          <BookHeart className="w-5 h-5 text-[#3B5BFF]" />
          <span className="text-sm font-semibold text-[#1f2937]">How Culture Context Works</span>
        </div>
        <p className="text-[13px] text-[#6b7280] mt-1">
          Culture documents are automatically analyzed and embedded into the AI knowledge base.
          When your team members chat with Meridian, relevant cultural context is injected to ensure
          responses align with your organization&apos;s values and norms.
        </p>
      </div>

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[12px] text-[#6b7280] mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3B5BFF] rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 py-3 px-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load culture documents.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">
            Retry
          </button>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-10 h-10 text-[#d1d5db] mb-3" />
            <p className="text-sm font-medium text-[#6b7280]">No culture documents uploaded yet</p>
            <p className="text-[12px] text-[#9ca3af] mt-1 max-w-xs">
              Upload your organization&apos;s culture handbook, values statement, or communication
              guidelines to get started.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Your First Document
            </Button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Document", "Status", "Uploaded", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-4 py-2.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                      <span className="text-[13px] font-medium text-[#1f2937] truncate max-w-[280px]">
                        {doc.filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        doc.status === "ready" || doc.status === "completed"
                          ? "bg-[#ECFDF5] text-[#059669]"
                          : doc.status === "processing"
                            ? "bg-[#FEF3C7] text-[#D97706]"
                            : "bg-[#f3f4f6] text-[#6b7280]"
                      }`}
                    >
                      {doc.status === "completed" ? "Ready" : doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#6b7280]">
                    {new Date(doc.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {deleteConfirmId === doc.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-red-600">Delete?</span>
                        <button
                          onClick={() => void handleDelete(doc.id)}
                          disabled={deleteMutation.isPending}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-800"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[11px] text-[#6b7280] hover:text-[#374151]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(doc.id)}
                        className="p-1 rounded hover:bg-red-50 text-[#9ca3af] hover:text-red-500 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </CompanyAdminLayout>
  )
}
