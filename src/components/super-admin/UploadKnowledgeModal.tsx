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
import { Loader2 } from "lucide-react"

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

  const upload = useUploadKnowledge()

  const agentOptions = domain ? AGENTS_BY_DOMAIN[domain] ?? [] : []

  function handleSubmit() {
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
          setTitle("")
          setDomain("")
          setAgentId("")
          setContent("")
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
            <Label htmlFor="kb-content">Content</Label>
            <Textarea
              id="kb-content"
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
            disabled={!title.trim() || !content.trim() || upload.isPending}
          >
            {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload & Vectorize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
