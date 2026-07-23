/**
 * /super-admin/research — consolidated "Research" surface.
 *
 * Folds the former "Document Research" (ask Sage) and "Research Library"
 * (saved results) into ONE left-nav item, plus a document upload that uses
 * the canonical document-service pipeline (presigned S3 → virus scan →
 * text extraction → chunk → embed into pgvector RAG) via `useDocumentUpload`
 * — the same standard path as My Documents / the home "Add" flow.
 */
import { useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDocumentUpload } from "@/hooks/documents/useDocumentUpload"
import DocumentResearchPage from "./DocumentResearchPage"
import ResearchLibraryPage from "./ResearchLibraryPage"

const ACCEPTED = ".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx,.html"

function ResearchUploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const upload = useDocumentUpload()

  const handleUpload = async () => {
    if (!files.length) return
    try {
      // One file at a time through the standard presigned → S3 → process
      // pipeline; tag as "research" so the corpus is filterable.
      for (const file of files) {
        await upload.mutateAsync({ file, docKind: "research", tags: ["research"] })
      }
      toast.success(
        `Uploaded ${files.length} document${files.length === 1 ? "" : "s"} to the research corpus.`,
      )
      setFiles([])
      if (inputRef.current) inputRef.current.value = ""
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" /> Upload research documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Files are stored and indexed through the standard document pipeline
          (virus scan → text extraction → chunk → embed into the searchable
          corpus) — the same path used by My Documents and the home "Add" flow.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block text-sm"
          aria-label="Choose research documents to upload"
        />
        {files.length > 0 && (
          <p className="text-xs text-slate-500">
            {files.length} file{files.length === 1 ? "" : "s"} selected
          </p>
        )}
        <Button onClick={handleUpload} disabled={!files.length || upload.isPending}>
          {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upload{files.length ? ` (${files.length})` : ""}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ResearchPage() {
  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-5xl py-8 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Research</h1>
          <p className="text-sm text-slate-600">
            Ask document-grounded research questions, browse your saved results,
            and add documents to the research corpus.
          </p>
        </header>

        <Tabs defaultValue="research">
          <TabsList>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="research" className="pt-4">
            <DocumentResearchPage embedded />
          </TabsContent>
          <TabsContent value="library" className="pt-4">
            <ResearchLibraryPage embedded />
          </TabsContent>
          <TabsContent value="upload" className="pt-4">
            <ResearchUploadPanel />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}
