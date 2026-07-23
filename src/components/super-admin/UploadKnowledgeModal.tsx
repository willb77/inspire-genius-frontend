import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUploadKnowledge } from "@/hooks/super-admin/knowledge/useKnowledge"
import { useDocumentUpload } from "@/hooks/documents/useDocumentUpload"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const FILE_ACCEPT = ".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx,.html"

const DOMAINS = [
  { value: "coaching", label: "Coaching" },
  { value: "business", label: "Business" },
  { value: "system", label: "System" },
  { value: "career", label: "Career & Talent" },
  { value: "general", label: "General" },
] as const

const AGENTS_BY_DOMAIN: Record<string, { value: string; label: string }[]> = {
  coaching: [
    { value: "aura", label: "Aura (PRISM)" },
    { value: "alex", label: "Alex (Student Success)" },
    { value: "nova", label: "Nova (Feedback)" },
    { value: "echo", label: "Echo (Sessions)" },
    { value: "ascend", label: "Ascend (Executive)" },
  ],
  business: [
    { value: "forge", label: "Forge (Onboarding)" },
    { value: "atlas", label: "Atlas (Dashboard)" },
    { value: "sage", label: "Sage (Documents)" },
    { value: "compass", label: "Compass (Support)" },
    { value: "james", label: "James (Admin)" },
    { value: "maven", label: "Maven (Interviews)" },
  ],
  system: [
    { value: "sentinel", label: "Sentinel (Audit)" },
    { value: "anchor", label: "Anchor (Prompts)" },
    { value: "nexus", label: "Nexus (RLHF)" },
    { value: "beacon", label: "Beacon (Notifications)" },
  ],
  career: [
    { value: "bridge", label: "Bridge (Pipeline)" },
    { value: "grant", label: "Grant (Financial Aid)" },
    { value: "alex", label: "Alex (Academic)" },
  ],
  general: [],
}

interface UploadKnowledgeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UploadKnowledgeModal({
  open,
  onOpenChange,
}: UploadKnowledgeModalProps) {
  const [title, setTitle] = useState("")
  const [domain, setDomain] = useState("")
  const [agentId, setAgentId] = useState("")
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const upload = useUploadKnowledge()
  const fileUpload = useDocumentUpload()

  const agentOptions = domain ? AGENTS_BY_DOMAIN[domain] ?? [] : []
  const busy = upload.isPending || fileUpload.isPending

  function reset() {
    setTitle("")
    setDomain("")
    setAgentId("")
    setContent("")
    setFile(null)
  }

  async function handleSubmit() {
    // Prefer a file: route it through the canonical document pipeline
    // (presigned S3 -> scan -> extract -> chunk -> RAG) as a SHARED corpus doc
    // so it's part of the Knowledge Base every agent can read.
    if (file) {
      const tags = ["knowledge-base", domain, agentId].filter(Boolean) as string[]
      try {
        await fileUpload.mutateAsync({
          file,
          docKind: "knowledge_base",
          tags,
          shared: true,
        })
        toast.success(`Uploaded ${file.name} to the shared Knowledge Base.`)
        reset()
        onOpenChange(false)
      } catch (err) {
        toast.error(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`)
      }
      return
    }

    // Fall back to the quick text-paste ingest.
    if (!title.trim() || !content.trim()) return
    upload.mutate(
      {
        documents: [
          {
            document_id: crypto.randomUUID(),
            title: title.trim(),
            text: content.trim(),
            source: "admin-upload",
            category: domain || "general",
          },
        ],
      },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Knowledge Document</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="kb-title">Title</Label>
            <Input
              id="kb-title"
              placeholder="e.g. PRISM Gold Trait Deep Dive"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Domain</Label>
              <Select value={domain} onValueChange={(v) => { setDomain(v); setAgentId("") }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Agent (optional)</Label>
              <Select value={agentId} onValueChange={setAgentId} disabled={!agentOptions.length}>
                <SelectTrigger>
                  <SelectValue placeholder={agentOptions.length ? "Select agent" : "Select domain first"} />
                </SelectTrigger>
                <SelectContent>
                  {agentOptions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="kb-file">Upload a file (recommended)</Label>
            <input
              id="kb-file"
              type="file"
              accept={FILE_ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block text-sm"
              aria-label="Choose a knowledge document to upload"
            />
            <p className="text-xs text-muted-foreground">
              Files go through the standard pipeline (virus scan → text extraction
              → embed) into the shared Knowledge Base.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="kb-content">
              {file ? "Content (ignored — a file is selected)" : "Or paste content (text)"}
            </Label>
            <Textarea
              id="kb-content"
              disabled={!!file}
              placeholder="Paste knowledge content here (Markdown supported)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            {content.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {content.length.toLocaleString()} characters ~{Math.ceil(content.length / 4).toLocaleString()} tokens
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={busy || (!file && (!title.trim() || !content.trim()))}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {file ? "Upload to Knowledge Base" : "Upload & Vectorize"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
