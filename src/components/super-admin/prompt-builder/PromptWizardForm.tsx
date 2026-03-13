import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type PromptWizardFormProps = {
  persona: string
  tone: string
  knowledgeDomain: string
  responseStyle: string
  constraints: string
  onPersonaChange: (v: string) => void
  onToneChange: (v: string) => void
  onKnowledgeDomainChange: (v: string) => void
  onResponseStyleChange: (v: string) => void
  onConstraintsChange: (v: string) => void
}

export default function PromptWizardForm({
  persona,
  tone,
  knowledgeDomain,
  responseStyle,
  constraints,
  onPersonaChange,
  onToneChange,
  onKnowledgeDomainChange,
  onResponseStyleChange,
  onConstraintsChange,
}: PromptWizardFormProps) {
  return (
    <Tabs defaultValue="persona" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="persona">Persona</TabsTrigger>
        <TabsTrigger value="tone">Tone</TabsTrigger>
        <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
        <TabsTrigger value="style">Style</TabsTrigger>
        <TabsTrigger value="constraints">Constraints</TabsTrigger>
      </TabsList>

      <TabsContent value="persona" className="space-y-3 mt-4">
        <Label htmlFor="persona">Persona</Label>
        <Textarea
          id="persona"
          placeholder="Define the coach's persona, background, and character..."
          value={persona}
          onChange={(e) => onPersonaChange(e.target.value)}
          rows={12}
          className="resize-none"
        />
      </TabsContent>

      <TabsContent value="tone" className="space-y-3 mt-4">
        <Label htmlFor="tone">Tone</Label>
        <Textarea
          id="tone"
          placeholder="Describe the desired communication tone (warm, professional, casual, etc.)..."
          value={tone}
          onChange={(e) => onToneChange(e.target.value)}
          rows={12}
          className="resize-none"
        />
      </TabsContent>

      <TabsContent value="knowledge" className="space-y-3 mt-4">
        <Label htmlFor="knowledge">Knowledge Domain</Label>
        <Textarea
          id="knowledge"
          placeholder="Specify the areas of expertise and knowledge the coach should demonstrate..."
          value={knowledgeDomain}
          onChange={(e) => onKnowledgeDomainChange(e.target.value)}
          rows={12}
          className="resize-none"
        />
      </TabsContent>

      <TabsContent value="style" className="space-y-3 mt-4">
        <Label htmlFor="style">Response Style</Label>
        <Textarea
          id="style"
          placeholder="Define how responses should be structured (length, format, examples, etc.)..."
          value={responseStyle}
          onChange={(e) => onResponseStyleChange(e.target.value)}
          rows={12}
          className="resize-none"
        />
      </TabsContent>

      <TabsContent value="constraints" className="space-y-3 mt-4">
        <Label htmlFor="constraints">Constraints</Label>
        <Textarea
          id="constraints"
          placeholder="List any limitations, guardrails, or topics to avoid..."
          value={constraints}
          onChange={(e) => onConstraintsChange(e.target.value)}
          rows={12}
          className="resize-none"
        />
      </TabsContent>
    </Tabs>
  )
}
